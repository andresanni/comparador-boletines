import type { BoletinData } from '../types/boletin';
import type {
  ComparisonResult,
  FieldDifference,
  NormalizationConfig,
} from '../types/comparison';
import { DEFAULT_NORMALIZATION } from '../types/comparison';

import { areEquivalent, areNamesEquivalent } from './normalizer';

export function compareBoletines(
  manual: BoletinData,
  app: BoletinData,
  config: NormalizationConfig = DEFAULT_NORMALIZATION
): ComparisonResult {
  const differences: FieldDifference[] = [];
  let diffCount = 0;

  function addDiff(
    category: FieldDifference['category'],
    item: string,
    valueManual: string,
    valueApp: string,
    subject?: string,
    bimestre?: number,
    severity: FieldDifference['severity'] = 'error'
  ) {
    if (!areEquivalent(valueManual, valueApp, config)) {
      diffCount++;
      differences.push({
        id: `diff-${diffCount}`,
        category,
        subject,
        item,
        bimestre,
        valueManual: valueManual || '(Vacío)',
        valueApp: valueApp || '(Vacío)',
        severity,
      });
    }
  }

  // 1. Estudiante
  if (manual.estudiante.dni && app.estudiante.dni) {
    addDiff('Estudiante', 'DNI', manual.estudiante.dni, app.estudiante.dni);
  }
  if (manual.estudiante.alumno && app.estudiante.alumno) {
    if (!areNamesEquivalent(manual.estudiante.alumno, app.estudiante.alumno, config)) {
      addDiff(
        'Estudiante',
        'Nombre del Alumno/a',
        manual.estudiante.alumno,
        app.estudiante.alumno,
        undefined,
        undefined,
        'warning'
      );
    }
  }
  if (manual.estudiante.grado && app.estudiante.grado) {
    addDiff('Estudiante', 'Grado', manual.estudiante.grado, app.estudiante.grado);
  }
  if (manual.estudiante.seccion && app.estudiante.seccion) {
    addDiff('Estudiante', 'Sección', manual.estudiante.seccion, app.estudiante.seccion);
  }
  if (manual.estudiante.ciclo && app.estudiante.ciclo) {
    addDiff('Estudiante', 'Ciclo', manual.estudiante.ciclo, app.estudiante.ciclo);
  }

  // 2. Apoyos e Integración
  addDiff(
    'Apoyos',
    '¿Promocionó con acompañamiento?',
    manual.apoyos.promocionoConAcompañamiento,
    app.apoyos.promocionoConAcompañamiento
  );
  addDiff(
    'Apoyos',
    '¿Posee apoyos / acompañamiento?',
    manual.apoyos.poseeApoyos,
    app.apoyos.poseeApoyos
  );
  addDiff(
    'Apoyos',
    '¿Cuáles apoyos?',
    manual.apoyos.cuales,
    app.apoyos.cuales
  );

  // 3. Materias y Calificaciones
  for (const mMan of manual.materias) {
    // Normalizar nombre de materia para búsqueda flexible (ej. '/' vs '-')
    const normName = mMan.nombre.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const mApp = app.materias.find(
      (m) => m.nombre.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() === normName
    );

    if (!mApp) {
      addDiff(
        'Materia Faltante',
        'Materia completa',
        `Presente: ${mMan.nombre}`,
        'No encontrada en boletín app',
        mMan.nombre
      );
      continue;
    }

    // PPI
    if (mMan.ppi || mApp.ppi) {
      addDiff('PPI', 'Estado PPI', mMan.ppi, mApp.ppi, mMan.nombre);
    }

    // Calificación General
    if (mMan.calificacionGeneral && mApp.calificacionGeneral) {
      for (let b = 0; b < 4; b++) {
        addDiff(
          'Calificación General',
          `Calificación General Bimestre ${b + 1}`,
          mMan.calificacionGeneral[b],
          mApp.calificacionGeneral[b],
          mMan.nombre,
          b + 1
        );
      }
    }

    // Criterios
    for (let cIdx = 0; cIdx < mMan.criterios.length; cIdx++) {
      const cMan = mMan.criterios[cIdx];
      const cApp = mApp.criterios[cIdx];

      if (!cApp) {
        addDiff(
          'Criterio Faltante',
          `Criterio #${cIdx + 1} (${cMan.label.slice(0, 30)}...)`,
          'Presente',
          'Ausente',
          mMan.nombre
        );
        continue;
      }

      for (let b = 0; b < 4; b++) {
        addDiff(
          'Calificación Criterio',
          `Criterio: "${cMan.label}" (Bim. ${b + 1})`,
          cMan.bimestres[b],
          cApp.bimestres[b],
          mMan.nombre,
          b + 1
        );
      }
    }
  }

  // 4. Asistencia
  for (let b = 0; b < 4; b++) {
    const aMan = manual.asistencias[b] || {
      asistencias: '',
      inasistencias: '',
      llegadasTarde: '',
      observaciones: '',
    };
    const aApp = app.asistencias[b] || {
      asistencias: '',
      inasistencias: '',
      llegadasTarde: '',
      observaciones: '',
    };

    addDiff(
      'Asistencia',
      `Asistencias Bimestre ${b + 1}`,
      aMan.asistencias,
      aApp.asistencias,
      undefined,
      b + 1
    );
    addDiff(
      'Inasistencia',
      `Inasistencias Bimestre ${b + 1}`,
      aMan.inasistencias,
      aApp.inasistencias,
      undefined,
      b + 1
    );
    addDiff(
      'Llegadas Tarde',
      `Llegadas tarde Bimestre ${b + 1}`,
      aMan.llegadasTarde,
      aApp.llegadasTarde,
      undefined,
      b + 1
    );
    addDiff(
      'Observaciones',
      `Observaciones Bimestre ${b + 1}`,
      aMan.observaciones,
      aApp.observaciones,
      undefined,
      b + 1
    );
  }

  // 5. Cierre anual
  addDiff(
    'Cierre',
    'Síntesis Conceptual',
    manual.cierre.sintesisConceptual,
    app.cierre.sintesisConceptual
  );
  addDiff(
    'Cierre',
    'Permanece en',
    manual.cierre.permaneceEn,
    app.cierre.permaneceEn
  );
  addDiff(
    'Cierre',
    'Promovido/a a',
    manual.cierre.promovidoA,
    app.cierre.promovidoA
  );

  const studentName = manual.estudiante.alumno || app.estudiante.alumno || 'Estudiante';
  const studentDni = manual.estudiante.dni || app.estudiante.dni || 'Sin DNI';

  return {
    id: `${studentDni}-${Date.now()}`,
    manualFile: manual.fileName,
    appFile: app.fileName,
    studentName,
    studentDni,
    grado: manual.estudiante.grado || app.estudiante.grado || '',
    seccion: manual.estudiante.seccion || app.estudiante.seccion || '',
    ciclo: manual.estudiante.ciclo || app.estudiante.ciclo || '',
    differences,
    isMatch: differences.length === 0,
    manualData: manual,
    appData: app,
  };
}
