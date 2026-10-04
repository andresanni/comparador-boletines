import type { BoletinData, MateriaCalificacion } from '../types/boletin';

/**
 * Normaliza y formatea notas para el CSV.
 * - Si es número (ej "7", "ALCANZADO 7", "8 (OCHO)"), devuelve el número (ej "7", "8").
 * - Si es conceptual (1er ciclo o criterio no numérico), devuelve la sigla (AL, AV, DE, EP, NC).
 * - Si está vacío o es un guión, devuelve "".
 */
export function formatGradeForCsv(val: string | undefined): string {
  if (!val) return '';
  const s = val.trim();
  if (s === '---' || s === '--' || s === '-' || s === '—' || s === '_' || s === '0') {
    return '';
  }

  // Si tiene un número explícito del 1 al 10 (frecuente en 2do ciclo)
  const numMatch = s.match(/\b(10|[1-9])\b/);
  if (numMatch) {
    return numMatch[1];
  }

  // Siglas conceptuales
  const upper = s.toUpperCase();
  if (upper.includes('CORRESPONDE') || upper === 'NC') return 'NC';
  if (upper.includes('DESTACADO') || upper === 'DE') return 'DE';
  if (upper.includes('AVANZADO') || upper === 'AV') return 'AV';
  if (upper.includes('ALCANZADO') || upper === 'AL') return 'AL';
  if (upper.includes('PROCESO') || upper === 'EP') return 'EP';
  if (upper.includes('NO ALCANZ') || upper === 'NA') return 'NA';

  return s;
}

/**
 * Normaliza PPI para el CSV: devuelve 'SI' o 'NO'.
 */
export function formatPpiForCsv(val: string | undefined): string {
  if (!val) return 'NO';
  const u = val.trim().toUpperCase();
  if (u === 'SI' || u.startsWith('SÍ') || u.startsWith('SI')) return 'SI';
  return 'NO';
}

/**
 * Normaliza el nombre del alumno para el CSV eliminando comas
 * (ej: "De los Santos, Oriana Sofia" -> "De los Santos Oriana Sofia")
 * garantizando que nunca se produzca un salto de columna indeseado al pegar o importar.
 */
export function cleanStudentNameForCsv(name: string | undefined | null): string {
  if (!name) return 'Sin Nombre';
  return name
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Escapa valores para cumplir el estándar RFC-4180 de CSV.
 * Rodea con comillas dobles si contiene comas, comillas dobles o saltos de línea.
 */
export function escapeCsvField(val: string | undefined | null): string {
  if (val === undefined || val === null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Identifica la clave canónica de una materia según su nombre en el boletín.
 */
export function getSubjectKey(name: string): string | null {
  const n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (n.includes('TRABAJO')) return 'trabajo_aula';
  if (n.includes('CONVIVENCIA')) return 'convivencia';
  if (n.includes('LENGUA') && !n.includes('EXTRANJERA') && !n.includes('INGL') && !n.includes('ADICIONAL')) return 'lengua';
  if (n.includes('MATEM')) return 'matematica';
  if (n.includes('CONOCIMIENTO') || n.includes('MUNDO')) return 'conocimiento_mundo';
  if (n.includes('SOCIAL')) return 'ciencias_sociales';
  if (n.includes('NATURAL')) return 'ciencias_naturales';
  if (n.includes('TECNO')) return 'tecnologia';
  if (n.includes('VISUAL') || n.includes('ARTE')) return 'artes_visuales';
  if (n.includes('MUSI')) return 'musica';
  if (n.includes('INGL') || n.includes('EXTRANJERA') || n.includes('ADICIONAL')) return 'ingles';
  if (n.includes('FISICA')) return 'educacion_fisica';
  return null;
}

/**
 * Retorna la lista de encabezados para el CSV (como array de strings).
 */
export function getCsvHeaderList(is2doCiclo: boolean): string[] {
  const headers = ['alumno_nombre'];

  // Trabajo en el aula y Convivencia (5 criterios c1..c5, sin PPI ni General)
  for (let c = 1; c <= 5; c++) headers.push(`trabajo_aula_c${c}`);
  for (let c = 1; c <= 5; c++) headers.push(`convivencia_c${c}`);

  // Materias curriculares
  const curricular = is2doCiclo
    ? ['lengua', 'matematica', 'ciencias_sociales', 'ciencias_naturales', 'tecnologia', 'artes_visuales', 'musica', 'ingles', 'educacion_fisica']
    : ['lengua', 'matematica', 'conocimiento_mundo', 'tecnologia', 'artes_visuales', 'musica', 'ingles', 'educacion_fisica'];

  for (const s of curricular) {
    headers.push(`${s}_ppi`);
    for (let c = 1; c <= 5; c++) {
      headers.push(`${s}_c${c}`);
    }
    headers.push(`${s}_gral`);
  }

  // Asistencias y observaciones
  headers.push('asistencias', 'inasistencias', 'llegadas_tarde', 'observaciones');
  return headers;
}

/**
 * Retorna la fila de encabezados en formato CSV.
 */
export function getCsvHeaders(is2doCiclo: boolean): string {
  return getCsvHeaderList(is2doCiclo).join(',');
}

/**
 * Genera el array de valores de un alumno para el bimestre dado.
 */
export function getBoletinCsvValues(
  boletin: BoletinData,
  bimestre: number,
  is2doCiclo: boolean
): string[] {
  const bIdx = Math.max(0, Math.min(3, bimestre - 1));

  const subjectOrder = is2doCiclo
    ? ['trabajo_aula', 'convivencia', 'lengua', 'matematica', 'ciencias_sociales', 'ciencias_naturales', 'tecnologia', 'artes_visuales', 'musica', 'ingles', 'educacion_fisica']
    : ['trabajo_aula', 'convivencia', 'lengua', 'matematica', 'conocimiento_mundo', 'tecnologia', 'artes_visuales', 'musica', 'ingles', 'educacion_fisica'];

  const mMap = new Map<string, MateriaCalificacion>();
  for (const m of boletin.materias) {
    const k = getSubjectKey(m.nombre);
    if (k) mMap.set(k, m);
  }

  const values: string[] = [];

  // 1. alumno_nombre (sin comas para evitar desfases al separar por comas en Sheets/Excel)
  values.push(cleanStudentNameForCsv(boletin.estudiante.alumno));

  // 2. Materias
  for (const sKey of subjectOrder) {
    const m = mMap.get(sKey);
    const hasPpiAndGral = (sKey !== 'trabajo_aula' && sKey !== 'convivencia');

    if (hasPpiAndGral) {
      values.push(m ? formatPpiForCsv(m.ppi) : 'NO');
    }

    // 5 criterios
    for (let c = 0; c < 5; c++) {
      const crit = m?.criterios?.[c];
      const val = crit?.bimestres?.[bIdx] || '';
      values.push(formatGradeForCsv(val));
    }

    if (hasPpiAndGral) {
      const gralVal = m?.calificacionGeneral?.[bIdx] || '';
      values.push(formatGradeForCsv(gralVal));
    }
  }

  // 3. Asistencias & Observaciones
  const asis = boletin.asistencias.find((a) => a.bimestre === bimestre);
  const formatAsisNum = (v?: string) => {
    if (!v || v === '---' || v === '--' || v === '-') return '';
    const m = v.match(/\d+/);
    return m ? m[0] : v;
  };

  const asistenciasVal = formatAsisNum(asis?.asistencias);
  let inasisVal = formatAsisNum(asis?.inasistencias);
  let tardesVal = formatAsisNum(asis?.llegadasTarde);

  // Si hay asistencias registradas pero inasistencias o llegadas tarde figuraban como guión, representa 0
  if (asistenciasVal && !inasisVal) inasisVal = '0';
  if (asistenciasVal && !tardesVal) tardesVal = '0';

  values.push(asistenciasVal);
  values.push(inasisVal);
  values.push(tardesVal);
  values.push(asis?.observaciones || '');

  return values;
}

/**
 * Convierte un boletin a una línea CSV debidamente escapada.
 */
export function generateBoletinCsvRow(
  boletin: BoletinData,
  bimestre: number,
  is2doCiclo: boolean
): string {
  const rawValues = getBoletinCsvValues(boletin, bimestre, is2doCiclo);
  return rawValues.map(escapeCsvField).join(',');
}

/**
 * Detecta si una lista de boletines pertenece a 2do Ciclo.
 */
export function detectIs2doCiclo(boletines: BoletinData[]): boolean {
  for (const b of boletines) {
    if (b.estudiante.ciclo?.toLowerCase().includes('2do') || b.estudiante.ciclo?.toLowerCase().includes('segundo')) {
      return true;
    }
    const gradoNum = parseInt(b.estudiante.grado, 10);
    if (!isNaN(gradoNum) && gradoNum >= 4) {
      return true;
    }
    if (b.materias.some((m) => {
      const k = getSubjectKey(m.nombre);
      return k === 'ciencias_sociales' || k === 'ciencias_naturales';
    })) {
      return true;
    }
  }
  return false;
}

/**
 * Genera el archivo CSV completo para un conjunto de boletines.
 * Incluye el BOM UTF-8 (\uFEFF) para compatibilidad total con Excel en Windows.
 */
export function generateFullCsv(
  boletines: BoletinData[],
  bimestre: number,
  forcedCiclo?: '1er Ciclo' | '2do Ciclo'
): string {
  const is2doCiclo = forcedCiclo
    ? forcedCiclo === '2do Ciclo'
    : detectIs2doCiclo(boletines);

  const lines: string[] = [];
  lines.push(getCsvHeaders(is2doCiclo));

  for (const b of boletines) {
    lines.push(generateBoletinCsvRow(b, bimestre, is2doCiclo));
  }

  // UTF-8 BOM
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Genera el contenido formateado con Tabulaciones (TSV)
 * para pegar directamente en Google Sheets o Excel con Ctrl+V
 * sin necesidad de usar "Dividir texto en columnas".
 */
export function generateFullTsv(
  boletines: BoletinData[],
  bimestre: number,
  forcedCiclo?: '1er Ciclo' | '2do Ciclo'
): string {
  const is2doCiclo = forcedCiclo
    ? forcedCiclo === '2do Ciclo'
    : detectIs2doCiclo(boletines);

  const lines: string[] = [];
  lines.push(getCsvHeaderList(is2doCiclo).join('\t'));

  for (const b of boletines) {
    const rawValues = getBoletinCsvValues(b, bimestre, is2doCiclo);
    lines.push(rawValues.join('\t'));
  }

  return lines.join('\r\n');
}

/**
 * Descarga el contenido como archivo CSV en el navegador.
 */
export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
