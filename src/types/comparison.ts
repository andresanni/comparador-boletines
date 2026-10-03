import type { BoletinData } from './boletin';

export type DiffCategory = 
  | 'Estudiante'
  | 'Apoyos'
  | 'PPI'
  | 'Calificación General'
  | 'Calificación Criterio'
  | 'Criterio Faltante'
  | 'Materia Faltante'
  | 'Asistencia'
  | 'Inasistencia'
  | 'Llegadas Tarde'
  | 'Observaciones'
  | 'Cierre';

export type DiffSeverity = 'error' | 'warning' | 'info';

export interface FieldDifference {
  id: string;
  category: DiffCategory;
  subject?: string;
  item: string;
  bimestre?: number;
  valueManual: string;
  valueApp: string;
  severity: DiffSeverity;
}

export interface ComparisonResult {
  id: string;
  manualFile: string;
  appFile: string;
  studentName: string;
  studentDni: string;
  grado: string;
  seccion: string;
  differences: FieldDifference[];
  isMatch: boolean;
  manualData?: BoletinData;
  appData?: BoletinData;
}

export interface NormalizationConfig {
  normalizeDashes: boolean;     // Tratar '---', '--', '-' como equivalentes
  ignoreCase: boolean;           // Tratar 'NO' y 'No' como iguales
  zeroAsEmpty: boolean;          // Tratar '0' como equivalente a guión o celda vacía
  ignoreWhitespace: boolean;     // Colapsar espacios múltiples y saltos de línea
  normalizeAccents: boolean;     // Ignorar tildes si es necesario en observaciones
  ignorePunctuation: boolean;    // Ignorar puntos finales en observaciones
}

export const DEFAULT_NORMALIZATION: NormalizationConfig = {
  normalizeDashes: true,
  ignoreCase: true,
  zeroAsEmpty: false,
  ignoreWhitespace: true,
  normalizeAccents: false,
  ignorePunctuation: false,
};
