#!/usr/bin/env node

/**
 * EXPORTADOR DE CALIFICACIONES A CSV (CLI)
 * Uso:
 *   node scripts/export-csv.mjs <archivo_o_carpeta> [--bimestre 1] [-o salida.csv] [--ciclo 1|2]
 */

import fs from 'fs';
import path from 'path';
import { parseBoletin } from './compare-cli.mjs';

function formatGradeForCsv(val) {
  if (!val) return '';
  const s = val.trim();
  if (s === '---' || s === '--' || s === '-' || s === '—' || s === '_' || s === '0') return '';

  const numMatch = s.match(/\b(10|[1-9])\b/);
  if (numMatch) return numMatch[1];

  const upper = s.toUpperCase();
  if (upper.includes('CORRESPONDE') || upper === 'NC') return 'NC';
  if (upper.includes('DESTACADO') || upper === 'DE') return 'DE';
  if (upper.includes('AVANZADO') || upper === 'AV') return 'AV';
  if (upper.includes('ALCANZADO') || upper === 'AL') return 'AL';
  if (upper.includes('PROCESO') || upper === 'EP') return 'EP';
  if (upper.includes('NO ALCANZ') || upper === 'NA') return 'NA';
  return s;
}

function formatPpi(val) {
  if (!val) return 'NO';
  const u = val.trim().toUpperCase();
  if (u === 'SI' || u.startsWith('SÍ') || u.startsWith('SI')) return 'SI';
  return 'NO';
}

function escapeCsvField(val) {
  if (val === undefined || val === null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function getSubjectKey(name) {
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

function getCsvHeaders(is2doCiclo) {
  const headers = ['alumno_nombre'];
  headers.push('trabajo_aula_c1', 'trabajo_aula_c2', 'trabajo_aula_c3', 'trabajo_aula_c4', 'trabajo_aula_c5');
  headers.push('convivencia_c1', 'convivencia_c2', 'convivencia_c3', 'convivencia_c4', 'convivencia_c5');

  const curricular = is2doCiclo
    ? ['lengua', 'matematica', 'ciencias_sociales', 'ciencias_naturales', 'tecnologia', 'artes_visuales', 'musica', 'ingles', 'educacion_fisica']
    : ['lengua', 'matematica', 'conocimiento_mundo', 'tecnologia', 'artes_visuales', 'musica', 'ingles', 'educacion_fisica'];

  for (const s of curricular) {
    headers.push(`${s}_ppi`, `${s}_c1`, `${s}_c2`, `${s}_c3`, `${s}_c4`, `${s}_c5`, `${s}_gral`);
  }

  headers.push('asistencias', 'inasistencias', 'llegadas_tarde', 'observaciones');
  return headers.join(',');
}

function generateCsvRow(boletin, bimestre, is2doCiclo) {
  const bIdx = Math.max(0, Math.min(3, bimestre - 1));

  const subjectOrder = is2doCiclo
    ? ['trabajo_aula', 'convivencia', 'lengua', 'matematica', 'ciencias_sociales', 'ciencias_naturales', 'tecnologia', 'artes_visuales', 'musica', 'ingles', 'educacion_fisica']
    : ['trabajo_aula', 'convivencia', 'lengua', 'matematica', 'conocimiento_mundo', 'tecnologia', 'artes_visuales', 'musica', 'ingles', 'educacion_fisica'];

  const mMap = new Map();
  for (const m of boletin.materias) {
    const k = getSubjectKey(m.nombre);
    if (k) mMap.set(k, m);
  }

  const values = [];
  const cleanName = (boletin.estudiante.alumno || 'Sin Nombre')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  values.push(escapeCsvField(cleanName));

  for (const sKey of subjectOrder) {
    const m = mMap.get(sKey);
    const hasPpiAndGral = (sKey !== 'trabajo_aula' && sKey !== 'convivencia');

    if (hasPpiAndGral) {
      values.push(m ? formatPpi(m.ppi) : 'NO');
    }

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

  const asis = boletin.asistencias.find((a) => a.bimestre === bimestre);
  const formatAsisNum = (v) => {
    if (!v || v === '---' || v === '--' || v === '-') return '';
    const m = v.match(/\d+/);
    return m ? m[0] : v;
  };

  const asistenciasVal = formatAsisNum(asis?.asistencias);
  let inasisVal = formatAsisNum(asis?.inasistencias);
  let tardesVal = formatAsisNum(asis?.llegadasTarde);

  if (asistenciasVal && !inasisVal) inasisVal = '0';
  if (asistenciasVal && !tardesVal) tardesVal = '0';

  values.push(asistenciasVal);
  values.push(inasisVal);
  values.push(tardesVal);
  values.push(escapeCsvField(asis?.observaciones || ''));

  return values.join(',');
}

function findPdfs(dirOrFile) {
  if (!fs.existsSync(dirOrFile)) return [];
  const stat = fs.statSync(dirOrFile);
  if (!stat.isDirectory()) {
    return dirOrFile.toLowerCase().endsWith('.pdf') ? [dirOrFile] : [];
  }
  const results = [];
  const items = fs.readdirSync(dirOrFile, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dirOrFile, item.name);
    if (item.isDirectory()) {
      results.push(...findPdfs(full));
    } else if (item.isFile() && item.name.toLowerCase().endsWith('.pdf')) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  let bimestre = 1;
  let outputFile = '';
  let forcedCiclo = null;
  const inputPaths = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--bimestre' || arg === '-b') {
      bimestre = parseInt(args[++i], 10) || 1;
    } else if (arg.startsWith('--bimestre=')) {
      bimestre = parseInt(arg.split('=')[1], 10) || 1;
    } else if (arg === '-o' || arg === '--out' || arg === '--output') {
      outputFile = args[++i];
    } else if (arg.startsWith('--out=')) {
      outputFile = arg.split('=')[1];
    } else if (arg === '--ciclo') {
      forcedCiclo = args[++i] === '2' ? '2do Ciclo' : '1er Ciclo';
    } else if (arg.startsWith('--ciclo=')) {
      forcedCiclo = arg.split('=')[1] === '2' ? '2do Ciclo' : '1er Ciclo';
    } else {
      inputPaths.push(arg);
    }
  }

  if (inputPaths.length === 0) {
    console.log(`
Uso:
  node scripts/export-csv.mjs <archivo_o_carpeta> [opciones]

Opciones:
  -b, --bimestre <1-4>   Bimestre a exportar (por defecto: 1)
  -o, --out <archivo>     Ruta de salida del archivo .csv
  --ciclo <1|2>          Forzar 1er Ciclo o 2do Ciclo (por defecto: auto-detectar)

Ejemplos:
  node scripts/export-csv.mjs "prueba_cursos_completos/01 - 1er GRADO" -b 1 -o notas_1er_bim.csv
  node scripts/export-csv.mjs samples/boletin_manual_oriana.pdf -b 2
`);
    process.exit(1);
  }

  const pdfFiles = [];
  for (const p of inputPaths) {
    pdfFiles.push(...findPdfs(p));
  }

  if (pdfFiles.length === 0) {
    console.error('Error: No se encontraron archivos PDF en las rutas especificadas.');
    process.exit(1);
  }

  console.log(`Procesando ${pdfFiles.length} boletines para el ${bimestre}° Bimestre...`);

  const boletines = [];
  for (const pdf of pdfFiles) {
    try {
      const b = await parseBoletin(pdf);
      boletines.push(b);
    } catch (err) {
      console.warn(`  ⚠️ Error al leer ${pdf}: ${err.message}`);
    }
  }

  if (boletines.length === 0) {
    console.error('Error: No se pudo extraer información de ningún boletín.');
    process.exit(1);
  }

  // Detectar ciclo
  const is2doCiclo = forcedCiclo
    ? forcedCiclo === '2do Ciclo'
    : boletines.some(b => {
        const ciclo = b.estudiante.ciclo || '';
        if (ciclo.includes('2do') || ciclo.includes('segundo')) return true;
        const g = parseInt(b.estudiante.grado, 10);
        if (!isNaN(g) && g >= 4) return true;
        return b.materias.some(m => {
          const k = getSubjectKey(m.nombre);
          return k === 'ciencias_sociales' || k === 'ciencias_naturales';
        });
      });

  console.log(`Ciclo detectado: ${is2doCiclo ? '2do Ciclo (11 materias)' : '1er Ciclo (10 materias)'}`);

  // Ordenar alfabéticamente por apellido y nombre
  boletines.sort((a, b) => (a.estudiante.alumno || '').localeCompare(b.estudiante.alumno || ''));

  const lines = [getCsvHeaders(is2doCiclo)];
  for (const b of boletines) {
    lines.push(generateCsvRow(b, bimestre, is2doCiclo));
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');

  if (outputFile) {
    fs.writeFileSync(outputFile, csvContent, 'utf8');
    console.log(`\n✅ CSV generado con éxito en: ${outputFile} (${boletines.length} alumnos)`);
  } else {
    console.log('\n--- CONTENIDO CSV ---');
    console.log(csvContent);
  }
}

main().catch(console.error);
