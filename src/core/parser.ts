import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type {
  BoletinData,
  StudentInfo,
  DispositivosApoyo,
  AsistenciaBimestre,
  CierreAnual,
  MateriaCalificacion,
} from '../types/boletin';
import { cleanText } from './normalizer';

// Set up the PDF worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface TextItemObj {
  str: string;
  x: number;
  y: number;
}

function getCol(x: number): number {
  if (x >= 335 && x < 405) return 0; // 1° Bimestre
  if (x >= 405 && x < 460) return 1; // 2° Bimestre
  if (x >= 460 && x < 515) return 2; // 3° Bimestre
  if (x >= 515) return 3;            // 4° Bimestre
  return -1;                         // Label / Description column (x < 335)
}

async function getPageItems(page: any): Promise<TextItemObj[]> {
  const tc = await page.getTextContent();
  return tc.items
    .filter((i: any) => 'str' in i && i.str && i.str.trim().length > 0)
    .map((i: any) => ({
      str: i.str.trim(),
      x: Math.round(i.transform[4]),
      y: Math.round(i.transform[5]),
    }));
}

function groupCriteriaLabels(items: TextItemObj[]): TextItemObj[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const criteria: TextItemObj[][] = [];
  let cur: TextItemObj[] = [];

  for (const it of sorted) {
    if (cur.length === 0) {
      cur.push(it);
    } else {
      const lastY = cur[cur.length - 1].y;
      if (lastY - it.y <= 16) {
        cur.push(it);
      } else {
        criteria.push(cur);
        cur = [it];
      }
    }
  }
  if (cur.length > 0) criteria.push(cur);
  return criteria;
}

// Fix multi-line "NO CORRESPONDE A LA PLANIFICACIÓN DEL BIMESTRE" bleed
function fixNoCorrespondeBleed(rows: { label: string; bimestres: [string, string, string, string] }[]) {
  for (let i = 0; i < rows.length; i++) {
    for (let c = 0; c < 4; c++) {
      const val = rows[i].bimestres[c];
      // If row i ends with "NO" and row i+1 starts with "CORRESPONDE"
      if (i + 1 < rows.length && /\bNO$/i.test(val) && /^CORRESPONDE/i.test(rows[i + 1].bimestres[c])) {
        rows[i].bimestres[c] = val.replace(/\s*NO$/i, '').trim();
        rows[i + 1].bimestres[c] = ('NO ' + rows[i + 1].bimestres[c]).trim();
      }
      // Canonical wording
      if (/CORRESPONDE\s+A\s+LA\s+PLANIFICACI[ÓO]N/i.test(rows[i].bimestres[c])) {
        rows[i].bimestres[c] = 'NO CORRESPONDE A LA PLANIFICACIÓN DEL BIMESTRE';
      }
    }
  }
}

export async function parseBoletinPDF(
  input: ArrayBuffer | Uint8Array,
  fileName: string = ''
): Promise<BoletinData> {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  const estudiante: StudentInfo = {
    alumno: '',
    dni: '',
    grado: '',
    seccion: '',
    turno: '',
    jornada: '',
    responsable: '',
    año: '2026',
  };

  const apoyos: DispositivosApoyo = {
    promocionoConAcompañamiento: '',
    poseeApoyos: '',
    cuales: '',
  };

  const materias: MateriaCalificacion[] = [];
  const asistencias: AsistenciaBimestre[] = [];
  const cierre: CierreAnual = {
    sintesisConceptual: '',
    permaneceEn: '',
    promovidoA: '',
  };

  // --- PAGE 1: Portada ---
  if (numPages >= 1) {
    const p1Items = await getPageItems(await doc.getPage(1));

    // Alumno (gather all items in name box on same line, handling split ligatures like So + fia)
    const alumnoLabel = p1Items.find(
      (i) => i.str.toLowerCase().includes('alumno/a') || i.str.toLowerCase().includes('alumno:')
    );
    if (alumnoLabel) {
      const nameItems = p1Items
        .filter((i) => Math.abs(i.y - alumnoLabel.y) <= 8 && i.x > 150 && !i.str.toLowerCase().includes('alumno'))
        .sort((a, b) => a.x - b.x);
      if (nameItems.length > 0) {
        estudiante.alumno = cleanText(nameItems.map((i) => i.str).join(' '));
      }
    }

    // DNI
    const dniLabel = p1Items.find((i) => i.str.toUpperCase() === 'DNI');
    if (dniLabel) {
      const dniItems = p1Items.filter((i) => Math.abs(i.y - dniLabel.y) <= 8 && i.x > 150);
      if (dniItems.length > 0) {
        estudiante.dni = dniItems[0].str.replace(/\D/g, '');
      }
    }

    // Grado, Sección, Turno, Jornada
    const gItems = p1Items.filter((i) => i.y <= 270 && i.y >= 245).sort((a, b) => a.x - b.x);
    if (gItems.length >= 4) {
      estudiante.grado = gItems[0].str;
      estudiante.seccion = gItems[1].str;
      estudiante.turno = gItems[2].str;
      estudiante.jornada = gItems[3].str;
    }

    // Responsable
    const respItems = p1Items.filter((i) => i.y <= 190 && i.y >= 165).sort((a, b) => a.x - b.x);
    if (respItems.length > 0) {
      estudiante.responsable = cleanText(respItems.map((i) => i.str).join(' '));
    }
  }

  // --- Dynamic Multi-Page Processing ---
  let p3Parsed = false;

  for (let pNum = 3; pNum <= numPages; pNum++) {
    const page = await doc.getPage(pNum);
    const items = (await getPageItems(page)).filter((i) => i.y > 70 && i.y < 795);
    const pageText = items.map((i) => i.str).join(' ');

    // 1. Page 3: Trabajo en el Aula + Convivencia + Apoyos
    if (!p3Parsed && (pageText.includes('TRABAJO EN EL AULA') || pageText.includes('dispositivos de apoyo'))) {
      p3Parsed = true;

      const mProm = pageText.match(/¿Promocionó con acompañamiento\?\s*([^¿]+)/i);
      if (mProm) apoyos.promocionoConAcompañamiento = cleanText(mProm[1]);
      const mPosee = pageText.match(/¿Posee apoyos\s*\/\s*acompañamiento\?\s*([^\s¿]+)/i);
      if (mPosee) apoyos.poseeApoyos = cleanText(mPosee[1]);
      const mCuales = pageText.match(/¿Cuáles\?\s*([^\s]+)/i);
      if (mCuales) apoyos.cuales = cleanText(mCuales[1]);

      const tAulaHeader = items.find((i) => i.x < 335 && i.str.toUpperCase().includes('TRABAJO'));
      const convHeader = items.find((i) => i.x < 335 && i.str.toUpperCase().includes('CONVIVENCIA'));

      if (tAulaHeader && convHeader) {
        const tAulaItems = items.filter((i) => i.x < 335 && i.y < tAulaHeader.y - 5 && i.y > convHeader.y + 5);
        const convItems = items.filter((i) => i.x < 335 && i.y < convHeader.y - 5 && i.y > 115);

        const critsAula = groupCriteriaLabels(tAulaItems);
        const critsConv = groupCriteriaLabels(convItems);

        const extract5Rows = (crits: TextItemObj[][], topLimit: number, bottomLimit: number) => {
          const anchors = crits.slice(0, 5).map((c) => ({
            label: cleanText(c.map((x) => x.str).join(' ')),
            topY: c[0].y,
            bottomY: c[c.length - 1].y,
          }));

          const colItems = items
            .filter((i) => i.x >= 335 && i.y <= topLimit && i.y >= bottomLimit)
            .filter(
              (i) =>
                !i.str.toLowerCase().includes('bimestre') &&
                !i.str.toLowerCase().includes('cuatrimestre') &&
                !i.str.toLowerCase().includes('primer') &&
                !i.str.toLowerCase().includes('segundo') &&
                !i.str.toLowerCase().includes('tercer') &&
                !i.str.toLowerCase().includes('cuarto')
            );

          const bounds: { upper: number; lower: number }[] = [];
          for (let k = 0; k < anchors.length; k++) {

            const upper = k === 0 ? topLimit : (anchors[k - 1].bottomY + anchors[k].topY) / 2;
            const lower =
              k === anchors.length - 1 ? bottomLimit : (anchors[k].bottomY + anchors[k + 1].topY) / 2;
            bounds.push({ upper, lower });
          }

          const extracted: { label: string; bimestres: [string, string, string, string] }[] = anchors.map(
            (a, k) => {
              const b = bounds[k];
              const rItems = colItems.filter((i) => i.y <= b.upper && i.y > b.lower);
              const bimestres: [string, string, string, string] = ['', '', '', ''];
              for (let c = 0; c < 4; c++) {
                const cItems = rItems
                  .filter((i) => getCol(i.x) === c)
                  .sort((x, y) => y.y - x.y)
                  .map((i) => i.str)
                  .join(' ');
                bimestres[c] = cleanText(cItems);
              }
              return { label: a.label, bimestres };
            }
          );

          fixNoCorrespondeBleed(extracted);
          return extracted;
        };

        materias.push({
          nombre: 'TRABAJO EN EL AULA',
          ppi: '',
          criterios: extract5Rows(critsAula, tAulaHeader.y - 5, convHeader.y + 10),
          calificacionGeneral: null,
        });

        materias.push({
          nombre: 'CONVIVENCIA',
          ppi: '',
          criterios: extract5Rows(critsConv, convHeader.y - 5, 120),
          calificacionGeneral: null,
        });
      }
      continue;
    }

    // 2. Curricular Subjects (identified by presence of PPI and CALIFICACIÓN GENERAL)
    const ppis = items.filter((i) => i.x < 335 && i.str.toUpperCase() === 'PPI').sort((a, b) => b.y - a.y);
    const gens = items
      .filter((i) => i.x < 335 && i.str.toUpperCase().includes('CALIFICACIÓN GENERAL') && i.y > 115)
      .sort((a, b) => b.y - a.y);

    if (ppis.length > 0 && gens.length > 0) {
      for (let t = 0; t < ppis.length; t++) {
        const ppiItem = ppis[t];
        const genItem = gens[t];
        if (!genItem) continue;

        const ppiY = ppiItem.y;
        const genY = genItem.y;

        // Subject Title: text immediately above PPI
        const titleItems = items
          .filter(
            (i) =>
              i.x < 335 &&
              i.y > ppiY &&
              i.y <= ppiY + 55 &&
              !i.str.includes('Ciclo') &&
              !i.str.includes('Grado') &&
              !i.str.toUpperCase().includes('CUATRIMESTRE')
          )
          .sort((a, b) => b.y - a.y);
        const title = cleanText(titleItems.map((i) => i.str).join(' '));

        // Exactly 5 criteria
        const between = items.filter((i) => i.x < 335 && i.y < ppiY - 5 && i.y > genY + 5);
        const crits = groupCriteriaLabels(between).slice(0, 5);

        // 7 Row Anchors: PPI (0), 5 Criteria (1..5), Calificación General (6)
        const rowAnchors = [
          { type: 'ppi', label: 'PPI', topY: ppiY + 6, bottomY: ppiY - 6 },
          ...crits.map((c) => ({
            type: 'criterio',
            label: cleanText(c.map((x) => x.str).join(' ')),
            topY: c[0].y,
            bottomY: c[c.length - 1].y,
          })),
          { type: 'gen', label: 'CALIFICACIÓN GENERAL', topY: genY + 6, bottomY: genY - 6 },
        ];

        const rowBounds: { upper: number; lower: number }[] = [];
        for (let k = 0; k < rowAnchors.length; k++) {

          const upper = k === 0 ? ppiY + 15 : (rowAnchors[k - 1].bottomY + rowAnchors[k].topY) / 2;
          const lower = k === rowAnchors.length - 1 ? genY - 15 : (rowAnchors[k].bottomY + rowAnchors[k + 1].topY) / 2;
          rowBounds.push({ upper, lower });
        }

        const colItems = items
          .filter((i) => i.x >= 335 && i.y <= ppiY + 15 && i.y >= genY - 15)
          .filter(
            (i) =>
              !i.str.toLowerCase().includes('bimestre') &&
              !i.str.toLowerCase().includes('cuatrimestre') &&
              !i.str.toLowerCase().includes('primer') &&
              !i.str.toLowerCase().includes('segundo') &&
              !i.str.toLowerCase().includes('tercer') &&
              !i.str.toLowerCase().includes('cuarto')
          );

        const rows = rowAnchors.map((anchor, k) => {
          const b = rowBounds[k];
          const rItems = colItems.filter((i) => i.y <= b.upper && i.y > b.lower);
          const bimestres: [string, string, string, string] = ['', '', '', ''];
          for (let c = 0; c < 4; c++) {
            const cItems = rItems
              .filter((i) => getCol(i.x) === c)
              .sort((x, y) => y.y - x.y)
              .map((i) => i.str)
              .join(' ');
            bimestres[c] = cleanText(cItems);
          }
          return { type: anchor.type, label: anchor.label, bimestres };
        });

        // Bleed correction for multi-line evaluation phrases
        fixNoCorrespondeBleed(rows);

        const ppiRow = rows.find((r) => r.type === 'ppi');
        const genRow = rows.find((r) => r.type === 'gen');
        const critRows = rows.filter((r) => r.type === 'criterio');

        materias.push({
          nombre: title,
          ppi: ppiRow ? ppiRow.bimestres[0] : '',
          criterios: critRows.map((r) => ({ label: r.label, bimestres: r.bimestres })),
          calificacionGeneral: genRow ? genRow.bimestres : ['', '', '', ''],
        });
      }
      continue;
    }

    // 3. Asistencia Pages (1° a 4° Bimestre)
    const mBimMatch = pageText.match(/([1234])°?\s*BIMESTRE.*Control de asistencia/i);
    if (mBimMatch) {
      const bim = parseInt(mBimMatch[1], 10);
      const asis: AsistenciaBimestre = {
        bimestre: bim,
        asistencias: '',
        inasistencias: '',
        llegadasTarde: '',
        observaciones: '',
      };

      const mAsis = pageText.match(/Asistencias\s+([^\s]+)/i);
      if (mAsis) asis.asistencias = cleanText(mAsis[1]);

      const mInasis = pageText.match(/Inasistencias\s+([^\s]+)/i);
      if (mInasis) asis.inasistencias = cleanText(mInasis[1]);

      const mTarde = pageText.match(/Llegadas tarde\s+([^\s]+)/i);
      if (mTarde) asis.llegadasTarde = cleanText(mTarde[1]);

      const mObs = pageText.match(/Observaciones\s+([^Firma]+)/i);
      if (mObs) asis.observaciones = cleanText(mObs[1]);

      asistencias.push(asis);
      continue;
    }

    // 4. Cierre Anual (Síntesis Conceptual)
    if (pageText.includes('Síntesis Conceptual') || pageText.includes('Promovido/a a')) {
      const mSint = pageText.match(/Síntesis Conceptual\s*([^Permanece]+)/i);
      if (mSint) cierre.sintesisConceptual = cleanText(mSint[1]);

      const mPerm = pageText.match(/Permanece en\s*([^Promovido]+)/i);
      if (mPerm) cierre.permaneceEn = cleanText(mPerm[1]);

      const mProm = pageText.match(/Promovido\/a a:\s*([^FIRMA]+)/i);
      if (mProm) cierre.promovidoA = cleanText(mProm[1]);
      continue;
    }
  }

  asistencias.sort((a, b) => a.bimestre - b.bimestre);

  return {
    fileName,
    numPages,
    estudiante,
    apoyos,
    materias,
    asistencias,
    cierre,
    rawParsedAt: new Date().toISOString(),
  };
}
