import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/fi\s+/g, 'fi')
    .replace(/fl\s+/g, 'fl')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeValue(val) {
  if (!val) return '';
  let s = cleanText(val);
  if (s === '---' || s === '--' || s === '-' || s === '—') return '';
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

async function getPageItems(page) {
  const tc = await page.getTextContent();
  return tc.items
    .filter(i => 'str' in i && i.str.trim().length > 0)
    .map(i => ({
      str: i.str.trim(),
      x: Math.round(i.transform[4]),
      y: Math.round(i.transform[5])
    }));
}

function groupLines(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  let curY = null;
  let curLine = [];
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

async function parseBoletin(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const numPages = doc.numPages;

  const result = {
    fileName: path.basename(filePath),
    estudiante: { alumno: '', dni: '', grado: '', seccion: '' },
    apoyos: { promocionoConAcompañamiento: '', poseeApoyos: '', cuales: '' },
    materias: [],
    asistencias: [],
    cierre: { sintesisConceptual: '', permaneceEn: '', promovidoA: '' }
  };

  // P1
  const p1Items = await getPageItems(await doc.getPage(1));
  const alumnoLabel = p1Items.find(i => i.str.toLowerCase().includes('alumno/a') || i.str.toLowerCase().includes('alumno:'));
  if (alumnoLabel) {
    const nameItem = p1Items.find(i => Math.abs(i.y - alumnoLabel.y) <= 6 && !i.str.toLowerCase().includes('alumno'));
    if (nameItem) result.estudiante.alumno = cleanText(nameItem.str);
    else {
      const m = alumnoLabel.str.match(/Alumno(?:\/a)?:\s*(.+)/i);
      if (m) result.estudiante.alumno = cleanText(m[1]);
    }
  }
  const p1Lines = groupLines(p1Items);
  for (let idx = 0; idx < p1Lines.length; idx++) {
    const lineStr = p1Lines[idx].map(i => i.str).join(' ');
    if (lineStr.toLowerCase().includes('dni')) {
      const m = lineStr.match(/\b\d{7,9}\b/);
      if (m) result.estudiante.dni = m[0];
    }
    if (lineStr.includes('GRADO') && lineStr.includes('SECCIÓN')) {
      if (idx + 1 < p1Lines.length) {
        const valLine = p1Lines[idx + 1].map(i => i.str);
        if (valLine.length >= 2) {
          result.estudiante.grado = valLine[0];
          result.estudiante.seccion = valLine[1];
        }
      }
    }
  }

  // P3 Top
  const p3Items = await getPageItems(await doc.getPage(3));
  const p3TopText = p3Items.filter(i => i.y > 670).map(i => i.str).join(' ');
  const mProm = p3TopText.match(/¿Promocionó con acompañamiento\?\s*([^¿]+)/i);
  if (mProm) result.apoyos.promocionoConAcompañamiento = cleanText(mProm[1]);
  const mPosee = p3TopText.match(/¿Posee apoyos\s*\/\s*acompañamiento\?\s*([^\s¿]+)/i);
  if (mPosee) result.apoyos.poseeApoyos = cleanText(mPosee[1]);
  const mCuales = p3TopText.match(/¿Cuáles\?\s*([^\s]+)/i);
  if (mCuales) result.apoyos.cuales = cleanText(mCuales[1]);

  // Tables P3..P8
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
    const contentItems = pageItems.filter(i => i.y <= 790 && i.y >= 90);
    const col1Marks = contentItems.filter(i => getCol(i.x) === 1 && i.str !== 'Bimestre').sort((a, b) => b.y - a.y);

    const rows = [];
    for (let r = 0; r < col1Marks.length; r++) {
      const mark = col1Marks[r];
      const prevMark = col1Marks[r - 1];
      const nextMark = col1Marks[r + 1];
      const yMax = prevMark ? (mark.y + prevMark.y) / 2 : mark.y + 25;
      const yMin = nextMark ? (mark.y + nextMark.y) / 2 : mark.y - 25;
      const rowItems = contentItems.filter(i => i.y <= yMax && i.y > yMin);
      const label = cleanText(rowItems.filter(i => getCol(i.x) === -1).sort((a, b) => b.y - a.y || a.x - b.x).map(i => i.str).join(' '));
      const bimestres = ['', '', '', ''];
      for (let c = 0; c < 4; c++) {
        bimestres[c] = cleanText(rowItems.filter(i => getCol(i.x) === c).sort((a, b) => b.y - a.y || a.x - b.x).map(i => i.str).join(' '));
      }
      rows.push({ label, bimestres });
    }

    if (p === 3) {
      const convIdx = rows.findIndex(r => r.label.includes('CONVIVENCIA'));
      result.materias.push({ nombre: 'TRABAJO EN EL AULA', ppi: '', criterios: (convIdx !== -1 ? rows.slice(0, convIdx) : rows.slice(0, 6)).filter(r => !r.label.includes('TRABAJO')), calificacionGeneral: null });
      result.materias.push({ nombre: 'CONVIVENCIA', ppi: '', criterios: (convIdx !== -1 ? rows.slice(convIdx) : rows.slice(6)).filter(r => !r.label.includes('CONVIVENCIA')), calificacionGeneral: null });
    } else if (p >= 4 && p <= 7) {
      const califGenIndices = [];
      rows.forEach((r, idx) => { if (r.label.includes('CALIFICACIÓN GENERAL')) califGenIndices.push(idx); });
      const names = subjectConfigs.filter(s => s.page === p).map(s => s.name);
      if (califGenIndices.length >= 2) {
        const t1 = rows.slice(0, califGenIndices[0] + 1);
        const ppi1 = t1.find(r => r.label.startsWith('PPI'));
        const gen1 = t1.find(r => r.label.includes('CALIFICACIÓN GENERAL'));
        result.materias.push({
          nombre: names[0],
          ppi: ppi1 ? ppi1.bimestres[0] : '',
          criterios: t1.filter(r => !r.label.includes('Ciclo') && !r.label.includes(names[0]) && !r.label.startsWith('PPI') && !r.label.includes('CALIFICACIÓN GENERAL')),
          calificacionGeneral: gen1 ? gen1.bimestres : ['', '', '', '']
        });

        const t2 = rows.slice(califGenIndices[0] + 1);
        const ppi2 = t2.find(r => r.label.startsWith('PPI'));
        const gen2 = t2.find(r => r.label.includes('CALIFICACIÓN GENERAL'));
        result.materias.push({
          nombre: names[1],
          ppi: ppi2 ? ppi2.bimestres[0] : '',
          criterios: t2.filter(r => !r.label.includes('Ciclo') && !r.label.includes(names[1]) && !r.label.startsWith('PPI') && !r.label.includes('CALIFICACIÓN GENERAL')),
          calificacionGeneral: gen2 ? gen2.bimestres : ['', '', '', '']
        });
      }
    } else if (p === 8) {
      const ppi = rows.find(r => r.label.startsWith('PPI'));
      const gen = rows.find(r => r.label.includes('CALIFICACIÓN GENERAL'));
      result.materias.push({
        nombre: 'EDUCACIÓN FÍSICA',
        ppi: ppi ? ppi.bimestres[0] : '',
        criterios: rows.filter(r => !r.label.includes('Ciclo') && !r.label.includes('EDUCACIÓN FÍSICA') && !r.label.startsWith('PPI') && !r.label.includes('CALIFICACIÓN GENERAL')),
        calificacionGeneral: gen ? gen.bimestres : ['', '', '', '']
      });
    }
  }

  // P9..P12 Asistencia
  for (let b = 1; b <= 4; b++) {
    const pNum = 8 + b;
    if (numPages >= pNum) {
      const items = await getPageItems(await doc.getPage(pNum));
      const text = items.map(i => i.str).join(' ');
      const mAsis = text.match(/Asistencias\s+([^\s]+)/i);
      const mInas = text.match(/Inasistencias\s+([^\s]+)/i);
      const mTarde = text.match(/Llegadas tarde\s+([^\s]+)/i);
      const mObs = text.match(/Observaciones\s+([^Firma]+)/i);
      result.asistencias.push({
        bimestre: b,
        asistencias: mAsis ? cleanText(mAsis[1]) : '',
        inasistencias: mInas ? cleanText(mInas[1]) : '',
        llegadasTarde: mTarde ? cleanText(mTarde[1]) : '',
        observaciones: mObs ? cleanText(mObs[1]) : ''
      });
    }
  }

  // P13
  if (numPages >= 13) {
    const items = await getPageItems(await doc.getPage(13));
    const text = items.map(i => i.str).join(' ');
    const mSint = text.match(/Síntesis Conceptual\s*([^Permanece]+)/i);
    const mPerm = text.match(/Permanece en\s*([^Promovido]+)/i);
    const mProm = text.match(/Promovido\/a a:\s*([^FIRMA]+)/i);
    if (mSint) result.cierre.sintesisConceptual = cleanText(mSint[1]);
    if (mPerm) result.cierre.permaneceEn = cleanText(mPerm[1]);
    if (mProm) result.cierre.promovidoA = cleanText(mProm[1]);
  }

  return result;
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
  check('Apoyos', 'Promocion', manual.apoyos.promocionoConAcompañamiento, app.apoyos.promocionoConAcompañamiento);
  check('Apoyos', 'PoseeApoyos', manual.apoyos.poseeApoyos, app.apoyos.poseeApoyos);

  for (const mMan of manual.materias) {
    const norm = mMan.nombre.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const mApp = app.materias.find(m => m.nombre.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() === norm);
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
  const fileMan = args[0] || 'samples/boletin_manual.pdf';
  const fileApp = args[1] || 'samples/boletin_app.pdf';

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
