import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { BoletinData, StudentInfo, DispositivosApoyo, AsistenciaBimestre, CierreAnual } from '../types/boletin';

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
  return -1; // Label / Description column (x < 335)
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

function groupLines(items: TextItemObj[]): TextItemObj[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextItemObj[][] = [];
  let curY: number | null = null;
  let curLine: TextItemObj[] = [];

  for (const it of sorted) {
    if (curY === null || Math.abs(curY - it.y) <= 4) {
      curLine.push(it);
      if (curY === null) curY = it.y;
    } else {
      lines.push(curLine);
      curLine = [it];
      curY = it.y;
    }
  }
  if (curLine.length > 0) lines.push(curLine);
  return lines;
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

  const materias: BoletinData['materias'] = [];
  const asistencias: AsistenciaBimestre[] = [];
  const cierre: CierreAnual = {
    sintesisConceptual: '',
    permaneceEn: '',
    promovidoA: '',
  };

  // --- PAGE 1: Portada ---
  if (numPages >= 1) {
    const p1Items = await getPageItems(await doc.getPage(1));
    const p1Lines = groupLines(p1Items);

    // Alumno
    const alumnoLabel = p1Items.find(
      (i) => i.str.toLowerCase().includes('alumno/a') || i.str.toLowerCase().includes('alumno:')
    );
    if (alumnoLabel) {
      const nameItem = p1Items.find(
        (i) => Math.abs(i.y - alumnoLabel.y) <= 6 && !i.str.toLowerCase().includes('alumno')
      );
      if (nameItem) {
        estudiante.alumno = cleanText(nameItem.str);
      } else {
        const m = alumnoLabel.str.match(/Alumno(?:\/a)?:\s*(.+)/i);
        if (m) estudiante.alumno = cleanText(m[1]);
      }
    }

    for (let idx = 0; idx < p1Lines.length; idx++) {
      const lineStr = p1Lines[idx].map((i) => i.str).join(' ');

      // DNI
      if (lineStr.toLowerCase().includes('dni')) {
        const m = lineStr.match(/\b\d{7,9}\b/);
        if (m) estudiante.dni = m[0];
      }

      // GRADO, SECCION, TURNO, JORNADA
      if (lineStr.includes('GRADO') && lineStr.includes('SECCIÓN')) {
        if (idx + 1 < p1Lines.length) {
          const valLine = p1Lines[idx + 1].map((i) => i.str);
          if (valLine.length >= 4) {
            estudiante.grado = valLine[0];
            estudiante.seccion = valLine[1];
            estudiante.turno = valLine[2];
            estudiante.jornada = valLine[3];
          }
        }
      }

      // Responsable
      if (lineStr.toLowerCase().includes('responsable') && !lineStr.toLowerCase().includes('firma')) {
        if (idx + 1 < p1Lines.length) {
          estudiante.responsable = cleanText(p1Lines[idx + 1].map((i) => i.str).join(' '));
        }
      }

      // Año
      const mYear = lineStr.match(/Año\s+(\d{4})/i);
      if (mYear) estudiante.año = mYear[1];
    }
  }

  // --- PAGE 3: Apoyos header ---
  if (numPages >= 3) {
    const p3Items = await getPageItems(await doc.getPage(3));
    const p3TopItems = p3Items.filter((i) => i.y > 670);
    const p3TopText = p3TopItems.map((i) => i.str).join(' ');

    const mProm = p3TopText.match(/¿Promocionó con acompañamiento\?\s*([^¿]+)/i);
    if (mProm) apoyos.promocionoConAcompañamiento = cleanText(mProm[1]);

    const mPosee = p3TopText.match(/¿Posee apoyos\s*\/\s*acompañamiento\?\s*([^\s¿]+)/i);
    if (mPosee) apoyos.poseeApoyos = cleanText(mPosee[1]);

    const mCuales = p3TopText.match(/¿Cuáles\?\s*([^\s]+)/i);
    if (mCuales) apoyos.cuales = cleanText(mCuales[1]);
  }

  // --- PAGES 3 to 8: Tables ---
  const subjectConfigs = [
    { page: 3, name: 'TRABAJO EN EL AULA' },
    { page: 3, name: 'CONVIVENCIA' },
    { page: 4, name: 'LENGUA' },
    { page: 4, name: 'MATEMÁTICA' },
    { page: 5, name: 'CIENCIAS SOCIALES' },
    { page: 5, name: 'CIENCIAS NATURALES' },
    { page: 6, name: 'TECNOLOGÍA, DISEÑO Y PROGRAMACIÓN' },
    { page: 6, name: 'EDUCACIÓN ARTÍSTICA - ARTES VISUALES' },
    { page: 7, name: 'EDUCACIÓN ARTÍSTICA - MÚSICA' },
    { page: 7, name: 'LENGUAS ADICIONALES - INGLÉS' },
    { page: 8, name: 'EDUCACIÓN FÍSICA' },
  ];

  for (let p = 3; p <= Math.min(numPages, 8); p++) {
    const pageItems = await getPageItems(await doc.getPage(p));
    const contentItems = pageItems.filter((i) => i.y <= 790 && i.y >= 90);

    // Row markers in Col 1 (Segundo Bimestre)
    const col1Marks = contentItems
      .filter((i) => getCol(i.x) === 1 && i.str !== 'Bimestre')
      .sort((a, b) => b.y - a.y);

    const rows: { label: string; bimestres: [string, string, string, string] }[] = [];

    for (let r = 0; r < col1Marks.length; r++) {
      const mark = col1Marks[r];
      const prevMark = col1Marks[r - 1];
      const nextMark = col1Marks[r + 1];

      const yMax = prevMark ? (mark.y + prevMark.y) / 2 : mark.y + 25;
      const yMin = nextMark ? (mark.y + nextMark.y) / 2 : mark.y - 25;

      const rowItems = contentItems.filter((i) => i.y <= yMax && i.y > yMin);

      const label = cleanText(
        rowItems
          .filter((i) => getCol(i.x) === -1)
          .sort((a, b) => b.y - a.y || a.x - b.x)
          .map((i) => i.str)
          .join(' ')
      );

      const bimestres: [string, string, string, string] = ['', '', '', ''];
      for (let c = 0; c < 4; c++) {
        const cItems = rowItems
          .filter((i) => getCol(i.x) === c)
          .sort((a, b) => b.y - a.y || a.x - b.x)
          .map((i) => i.str)
          .join(' ');
        bimestres[c] = cleanText(cItems);
      }

      rows.push({ label, bimestres });
    }

    if (p === 3) {
      const convIdx = rows.findIndex((r) => r.label.includes('CONVIVENCIA'));
      const tAulaRows = convIdx !== -1 ? rows.slice(0, convIdx) : rows.slice(0, 6);
      const convRows = convIdx !== -1 ? rows.slice(convIdx) : rows.slice(6);

      materias.push({
        nombre: 'TRABAJO EN EL AULA',
        ppi: '',
        criterios: tAulaRows.filter((r) => !r.label.includes('TRABAJO EN EL AULA')),
        calificacionGeneral: null,
      });

      materias.push({
        nombre: 'CONVIVENCIA',
        ppi: '',
        criterios: convRows.filter((r) => !r.label.includes('CONVIVENCIA')),
        calificacionGeneral: null,
      });
    } else if (p >= 4 && p <= 7) {
      const califGenIndices: number[] = [];
      rows.forEach((r, idx) => {
        if (r.label.includes('CALIFICACIÓN GENERAL')) califGenIndices.push(idx);
      });

      const names = subjectConfigs.filter((s) => s.page === p).map((s) => s.name);

      if (califGenIndices.length >= 2) {
        // Table 1
        const t1Rows = rows.slice(0, califGenIndices[0] + 1);
        const ppi1 = t1Rows.find((r) => r.label === 'PPI' || r.label.startsWith('PPI'));
        const gen1 = t1Rows.find((r) => r.label.includes('CALIFICACIÓN GENERAL'));
        const crit1 = t1Rows.filter(
          (r) =>
            !r.label.includes('Ciclo') &&
            !r.label.includes(names[0]) &&
            !r.label.startsWith('PPI') &&
            !r.label.includes('CALIFICACIÓN GENERAL')
        );

        materias.push({
          nombre: names[0],
          ppi: ppi1 ? ppi1.bimestres[0] : '',
          criterios: crit1,
          calificacionGeneral: gen1 ? gen1.bimestres : ['', '', '', ''],
        });

        // Table 2
        const t2Rows = rows.slice(califGenIndices[0] + 1);
        const ppi2 = t2Rows.find((r) => r.label === 'PPI' || r.label.startsWith('PPI'));
        const gen2 = t2Rows.find((r) => r.label.includes('CALIFICACIÓN GENERAL'));
        const crit2 = t2Rows.filter(
          (r) =>
            !r.label.includes('Ciclo') &&
            !r.label.includes(names[1]) &&
            !r.label.startsWith('PPI') &&
            !r.label.includes('CALIFICACIÓN GENERAL')
        );

        materias.push({
          nombre: names[1],
          ppi: ppi2 ? ppi2.bimestres[0] : '',
          criterios: crit2,
          calificacionGeneral: gen2 ? gen2.bimestres : ['', '', '', ''],
        });
      }
    } else if (p === 8) {
      // 1 subject: Educación Física
      const ppi = rows.find((r) => r.label === 'PPI' || r.label.startsWith('PPI'));
      const gen = rows.find((r) => r.label.includes('CALIFICACIÓN GENERAL'));
      const crit = rows.filter(
        (r) =>
          !r.label.includes('Ciclo') &&
          !r.label.includes('EDUCACIÓN FÍSICA') &&
          !r.label.startsWith('PPI') &&
          !r.label.includes('CALIFICACIÓN GENERAL')
      );

      materias.push({
        nombre: 'EDUCACIÓN FÍSICA',
        ppi: ppi ? ppi.bimestres[0] : '',
        criterios: crit,
        calificacionGeneral: gen ? gen.bimestres : ['', '', '', ''],
      });
    }
  }

  // --- PAGES 9 to 12: Asistencia ---
  for (let bim = 1; bim <= 4; bim++) {
    const pNum = 8 + bim;
    if (numPages >= pNum) {
      const pageItems = await getPageItems(await doc.getPage(pNum));
      const fullText = pageItems.map((i) => i.str).join(' ');

      const asis: AsistenciaBimestre = {
        bimestre: bim,
        asistencias: '',
        inasistencias: '',
        llegadasTarde: '',
        observaciones: '',
      };

      const mAsis = fullText.match(/Asistencias\s+([^\s]+)/i);
      if (mAsis) asis.asistencias = cleanText(mAsis[1]);

      const mInasis = fullText.match(/Inasistencias\s+([^\s]+)/i);
      if (mInasis) asis.inasistencias = cleanText(mInasis[1]);

      const mTarde = fullText.match(/Llegadas tarde\s+([^\s]+)/i);
      if (mTarde) asis.llegadasTarde = cleanText(mTarde[1]);

      const mObs = fullText.match(/Observaciones\s+([^Firma]+)/i);
      if (mObs) asis.observaciones = cleanText(mObs[1]);

      asistencias.push(asis);
    }
  }

  // --- PAGE 13: Cierre ---
  if (numPages >= 13) {
    const p13Items = await getPageItems(await doc.getPage(13));
    const full13 = p13Items.map((i) => i.str).join(' ');

    const mSint = full13.match(/Síntesis Conceptual\s*([^Permanece]+)/i);
    if (mSint) cierre.sintesisConceptual = cleanText(mSint[1]);

    const mPerm = full13.match(/Permanece en\s*([^Promovido]+)/i);
    if (mPerm) cierre.permaneceEn = cleanText(mPerm[1]);

    const mPromovido = full13.match(/Promovido\/a a:\s*([^FIRMA]+)/i);
    if (mPromovido) cierre.promovidoA = cleanText(mPromovido[1]);
  }

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
