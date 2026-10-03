export interface StudentInfo {
  alumno: string;
  dni: string;
  grado: string;
  seccion: string;
  turno: string;
  jornada: string;
  responsable: string;
  año: string;
}

export interface DispositivosApoyo {
  promocionoConAcompañamiento: string;
  poseeApoyos: string;
  cuales: string;
}

export interface CriterioEvaluacion {
  label: string;
  bimestres: [string, string, string, string]; // [1°, 2°, 3°, 4°]
}

export interface MateriaCalificacion {
  nombre: string;
  ppi: string; // "NO", "SI", etc.
  criterios: CriterioEvaluacion[];
  calificacionGeneral: [string, string, string, string] | null;
}

export interface AsistenciaBimestre {
  bimestre: number;
  asistencias: string;
  inasistencias: string;
  llegadasTarde: string;
  observaciones: string;
}

export interface CierreAnual {
  sintesisConceptual: string;
  permaneceEn: string;
  promovidoA: string;
}

export interface BoletinData {
  fileName: string;
  fileSize?: number;
  numPages: number;
  estudiante: StudentInfo;
  apoyos: DispositivosApoyo;
  materias: MateriaCalificacion[];
  asistencias: AsistenciaBimestre[];
  cierre: CierreAnual;
  rawParsedAt?: string;
}
