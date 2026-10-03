import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/\b(\w+)\s+(fi\w*)\b/gi, '$1$2')
    .replace(/fi\s*/g, 'fi')
    .replace(/fl\s*/g, 'fl')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015_]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeValue(val, options = { zeroAsEmpty: true }) {
  if (!val) return '';
  let s = cleanText(val);
  if (/CORRESPONDE\s+A\s+LA\s+PLANIFICACI[ÓO]N/i.test(s)) {
    return 'NO CORRESPONDE A LA PLANIFICACIÓN DEL BIMESTRE';
  }
  if (s === '---' || s === '--' || s === '-' || s === '—' || s === '_') return '';
  if (options.zeroAsEmpty && s === '0') return '';
  const lower = s.toLowerCase();
  if (lower === 'no') return 'NO';
  if (lower === 'si' || lower === 'sí') return 'SI';
  return s.toLowerCase();
}

function areEquivalent(a, b) {
  return normalizeValue(a) === normalizeValue(b);
}

function getCol(x) {
  if (x >= 335 && x < 405) return 0;
  if (x >= 405 && x < 460) return 1;
  if (x >= 460 && x < 515) return 2;
  if (x >= 515) return 3;
  return -1;
}

function groupCriteriaLabels(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const criteria = [];
  let cur = [];
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

function fixNoCorrespondeBleed(rows) {
  for (let i = 0; i < rows.length; i++) {
    for (let c = 0; c < 4; c++) {
      const val = rows[i].bimestres[c];
      if (i + 1 < rows.length && /\bNO$/i.test(val) && /^CORRESPONDE/i.test(rows[i + 1].bimestres[c])) {
        rows[i].bimestres[c] = val.replace(/\s*NO$/i, '').trim();
        rows[i + 1].bimestres[c] = ('NO ' + rows[i + 1].bimestres[c]).trim();
      }
      if (/CORRESPONDE\s+A\s+LA\s+PLANIFICACI[ÓO]N/i.test(rows[i].bimestres[c])) {
        rows[i].bimestres[c] = 'NO CORRESPONDE A LA PLANIFICACIÓN DEL BIMESTRE';
      }
    }
  }
}

async function getPageItems(page) {
  const tc = await page.getTextContent();
  return tc.items
    .filter((i) => 'str' in i && i.str && i.str.trim().length > 0)
    .map((i) => ({
      str: i.str.trim(),
      x: Math.round(i.transform[4]),
      y: Math.round(i.transform[5]),
    }));
}

export async function parseBoletin(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const numPages = doc.numPages;

  const estudiante = { alumno: '', dni: '', grado: '', seccion: '', turno: '', jornada: '', responsable: '' };
  const apoyos = { promocionoConAcompañamiento: '', poseeApoyos: '', cuales: '' };
  const materias = [];
  const asistencias = [];
  const cierre = { sintesisConceptual: '', permaneceEn: '', promovidoA: '' };

  // P1
  const p1 = await doc.getPage(1);
  const p1Items = await getPageItems(p1);
  const alumnoLabel = p1Items.find((i) => i.str.toLowerCase().includes('alumno/a') || i.str.toLowerCase().includes('alumno:'));
  if (alumnoLabel) {
    const nameItems = p1Items
      .filter((i) => Math.abs(i.y - alumnoLabel.y) <= 8 && i.x > 150 && !i.str.toLowerCase().includes('alumno'))
      .sort((a, b) => a.x - b.x);
    if (nameItems.length > 0) {
      estudiante.alumno = cleanText(nameItems.map((i) => i.str).join(' '));
    }
  }

  const dniLabel = p1Items.find((i) => i.str.toUpperCase() === 'DNI');
  if (dniLabel) {
    const dniItems = p1Items.filter((i) => Math.abs(i.y - dniLabel.y) <= 8 && i.x > 150);
    if (dniItems.length > 0) estudiante.dni = dniItems[0].str.replace(/\D/g, '');
  }

  const gItems = p1Items.filter((i) => i.y <= 270 && i.y >= 245).sort((a, b) => a.x - b.x);
  if (gItems.length >= 4) {
    estudiante.grado = gItems[0].str;
    estudiante.seccion = gItems[1].str;
    estudiante.turno = gItems[2].str;
    estudiante.jornada = gItems[3].str;
  }

  let p3Parsed = false;
  for (let pNum = 3; pNum <= numPages; pNum++) {
    const page = await doc.getPage(pNum);
    const items = (await getPageItems(page)).filter((i) => i.y > 70 && i.y < 795);
    const pageText = items.map((i) => i.str).join(' ');

    // Page 3
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

        const extract5Rows = (crits, topLimit, bottomLimit) => {
          const anchors = crits.slice(0, 5).map((c) => ({
            label: cleanText(c.map((x) => x.str).join(' ')),
            topY: c[0].y,
            bottomY: c[c.length - 1].y,
          }));
          const colItems = items
            .filter((i) => i.x >= 335 && i.y <= topLimit && i.y >= bottomLimit)
            .filter((i) => !i.str.toLowerCase().includes('bimestre') && !i.str.toLowerCase().includes('cuatrimestre') && !i.str.toLowerCase().includes('primer') && !i.str.toLowerCase().includes('segundo') && !i.str.toLowerCase().includes('tercer') && !i.str.toLowerCase().includes('cuarto'));

          const bounds = [];
          for (let k = 0; k < anchors.length; k++) {
            const upper = k === 0 ? topLimit : (anchors[k - 1].bottomY + anchors[k].topY) / 2;
            const lower = k === anchors.length - 1 ? bottomLimit : (anchors[k].bottomY + anchors[k + 1].topY) / 2;
            bounds.push({ upper, lower });
          }

          const extracted = anchors.map((a, k) => {
            const b = bounds[k];
            const rItems = colItems.filter((i) => i.y <= b.upper && i.y > b.lower);
            const bimestres = ['', '', '', ''];
            for (let c = 0; c < 4; c++) {
              const cItems = rItems
                .filter((i) => getCol(i.x) === c)
                .sort((x, y) => y.y - x.y)
                .map((i) => i.str)
                .join(' ');
              bimestres[c] = cleanText(cItems);
            }
            return { label: a.label, bimestres };
          });
          fixNoCorrespondeBleed(extracted);
          return extracted;
        };

        materias.push({ nombre: 'TRABAJO EN EL AULA', ppi: '', criterios: extract5Rows(critsAula, tAulaHeader.y - 5, convHeader.y + 10), calificacionGeneral: null });
        materias.push({ nombre: 'CONVIVENCIA', ppi: '', criterios: extract5Rows(critsConv, convHeader.y - 5, 120), calificacionGeneral: null });
      }
      continue;
    }

    // Curricular Subjects
    const ppis = items.filter((i) => i.x < 335 && i.str.toUpperCase() === 'PPI').sort((a, b) => b.y - a.y);
    const gens = items.filter((i) => i.x < 335 && i.str.toUpperCase().includes('CALIFICACIÓN GENERAL') && i.y > 115).sort((a, b) => b.y - a.y);

    if (ppis.length > 0 && gens.length > 0) {
      for (let t = 0; t < ppis.length; t++) {
        const ppiItem = ppis[t];
        const genItem = gens[t];
        if (!genItem) continue;

        const ppiY = ppiItem.y;
        const genY = genItem.y;

        const titleItems = items
          .filter((i) => i.x < 335 && i.y > ppiY && i.y <= ppiY + 55 && !i.str.includes('Ciclo') && !i.str.includes('Grado') && !i.str.toUpperCase().includes('CUATRIMESTRE'))
          .sort((a, b) => b.y - a.y);
        const title = cleanText(titleItems.map((i) => i.str).join(' '));

        const between = items.filter((i) => i.x < 335 && i.y < ppiY - 5 && i.y > genY + 5);
        const crits = groupCriteriaLabels(between).slice(0, 5);

        const rowAnchors = [
          { type: 'ppi', label: 'PPI', topY: ppiY + 6, bottomY: ppiY - 6 },
          ...crits.map((c) => ({ type: 'criterio', label: cleanText(c.map((x) => x.str).join(' ')), topY: c[0].y, bottomY: c[c.length - 1].y })),
          { type: 'gen', label: 'CALIFICACIÓN GENERAL', topY: genY + 6, bottomY: genY - 6 },
        ];

        const rowBounds = [];
        for (let k = 0; k < rowAnchors.length; k++) {
          const upper = k === 0 ? ppiY + 15 : (rowAnchors[k - 1].bottomY + rowAnchors[k].topY) / 2;
          const lower = k === rowAnchors.length - 1 ? genY - 15 : (rowAnchors[k].bottomY + rowAnchors[k + 1].topY) / 2;
          rowBounds.push({ upper, lower });
        }

        const colItems = items
          .filter((i) => i.x >= 335 && i.y <= ppiY + 15 && i.y >= genY - 15)
          .filter((i) => !i.str.toLowerCase().includes('bimestre') && !i.str.toLowerCase().includes('cuatrimestre') && !i.str.toLowerCase().includes('primer') && !i.str.toLowerCase().includes('segundo') && !i.str.toLowerCase().includes('tercer') && !i.str.toLowerCase().includes('cuarto'));

        const rows = rowAnchors.map((anchor, k) => {
          const b = rowBounds[k];
          const rItems = colItems.filter((i) => i.y <= b.upper && i.y > b.lower);
          const bimestres = ['', '', '', ''];
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

    // Asistencia
    const mBimMatch = pageText.match(/([1234])°?\s*BIMESTRE.*Control de asistencia/i);
    if (mBimMatch) {
      const bim = parseInt(mBimMatch[1], 10);
      const mAsis = pageText.match(/Asistencias\s+([^\s]+)/i);
      const mInas = pageText.match(/Inasistencias\s+([^\s]+)/i);
      const mTarde = pageText.match(/Llegadas tarde\s+([^\s]+)/i);
      const mObs = pageText.match(/Observaciones\s+([^Firma]+)/i);
      asistencias.push({
        bimestre: bim,
        asistencias: mAsis ? cleanText(mAsis[1]) : '',
        inasistencias: mInas ? cleanText(mInas[1]) : '',
        llegadasTarde: mTarde ? cleanText(mTarde[1]) : '',
        observaciones: mObs ? cleanText(mObs[1]) : '',
      });
      continue;
    }

    // Cierre
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
    fileName: path.basename(filePath),
    numPages,
    estudiante,
    apoyos,
    materias,
    asistencias,
    cierre,
  };
}

function compare(manual, app) {
  const diffs = [];
  function check(cat, item, vMan, vApp, subj) {
    if (!areEquivalent(vMan, vApp)) {
      diffs.push({ category: cat, item, subject: subj, manual: vMan || '(vacío)', app: vApp || '(vacío)' });
    }
  }

  check('Estudiante', 'DNI', manual.estudiante.dni, app.estudiante.dni);
  check('Estudiante', 'Alumno', manual.estudiante.alumno, app.estudiante.alumno);

  for (const mMan of manual.materias) {
    const norm = mMan.nombre.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const mApp = app.materias.find((m) => m.nombre.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() === norm);
    if (!mApp) {
      diffs.push({ category: 'Materia Faltante', item: mMan.nombre, manual: 'Presente', app: 'Ausente' });
      continue;
    }
    if (mMan.ppi || mApp.ppi) check('PPI', 'Estado PPI', mMan.ppi, mApp.ppi, mMan.nombre);
    if (mMan.calificacionGeneral && mApp.calificacionGeneral) {
      for (let b = 0; b < 4; b++) {
        check('Calificación General', `Bimestre ${b + 1}`, mMan.calificacionGeneral[b], mApp.calificacionGeneral[b], mMan.nombre);
      }
    }
    for (let c = 0; c < mMan.criterios.length; c++) {
      const cMan = mMan.criterios[c];
      const cApp = mApp.criterios[c];
      if (!cApp) continue;
      for (let b = 0; b < 4; b++) {
        check('Criterio', `"${cMan.label.slice(0, 30)}..." Bim ${b + 1}`, cMan.bimestres[b], cApp.bimestres[b], mMan.nombre);
      }
    }
  }

  for (let b = 0; b < 4; b++) {
    const aMan = manual.asistencias[b] || {};
    const aApp = app.asistencias[b] || {};
    check('Asistencia', `Asistencias Bim ${b + 1}`, aMan.asistencias, aApp.asistencias);
    check('Inasistencia', `Inasistencias Bim ${b + 1}`, aMan.inasistencias, aApp.inasistencias);
    check('Llegadas Tarde', `Llegadas tarde Bim ${b + 1}`, aMan.llegadasTarde, aApp.llegadasTarde);
    check('Observaciones', `Observaciones Bim ${b + 1}`, aMan.observaciones, aApp.observaciones);
  }

  return diffs;
}

async function main() {
  const args = process.argv.slice(2);
  const fileMan = args[0] || 'samples/boletin_manual_oriana.pdf';
  const fileApp = args[1] || 'samples/boletin_app_oriana.pdf';

  console.log(`\n========================================`);
  console.log(` AUDITOR DE BOLETINES (CLI)`);
  console.log(` Manual: ${fileMan}`);
  console.log(` App:    ${fileApp}`);
  console.log(`========================================\n`);

  const man = await parseBoletin(fileMan);
  const app = await parseBoletin(fileApp);

  console.log(`Estudiante: ${man.estudiante.alumno || app.estudiante.alumno} (DNI: ${man.estudiante.dni || app.estudiante.dni})`);
  console.log(`Materias auditadas: ${man.materias.length}`);

  const diffs = compare(man, app);

  if (diffs.length === 0) {
    console.log(`\n✅ ¡INTEGRIDAD 100% VERIFICADA! No se encontraron diferencias.`);
  } else {
    console.log(`\n⚠️ SE ENCONTRARON ${diffs.length} DISCREPANCIAS:\n`);
    diffs.forEach((d, idx) => {
      console.log(`  [${idx + 1}] [${d.category}] ${d.subject ? d.subject + ' > ' : ''}${d.item}`);
      console.log(`      Manual: ${d.manual}`);
      console.log(`      App:    ${d.app}\n`);
    });
  }
}

main().catch(console.error);
