import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  UploadCloud,
  Trash2,
  Table,
  FileSpreadsheet,
  FileText,
  Search,
} from 'lucide-react';
import type { BoletinData } from '../types/boletin';
import { parseBoletinPDF } from '../core/parser';
import {
  getCsvHeaderList,
  getBoletinCsvValues,
  generateFullCsv,
  generateFullTsv,
  downloadCsvFile,
  detectIs2doCiclo,
} from '../core/csvExporter';

export const CsvExportView: React.FC = () => {
  const [boletines, setBoletines] = useState<BoletinData[]>([]);
  const [selectedBimestre, setSelectedBimestre] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [showRawCsv, setShowRawCsv] = useState<boolean>(false);
  const [copiedTsv, setCopiedTsv] = useState<boolean>(false);
  const [forcedCiclo, setForcedCiclo] = useState<'auto' | '1er Ciclo' | '2do Ciclo'>('auto');

  // Carga de PDFs
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const pdfFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.pdf'));

    try {
      const parsedList: BoletinData[] = [];
      for (const file of pdfFiles) {
        const buffer = await file.arrayBuffer();
        const data = await parseBoletinPDF(buffer, file.name);
        parsedList.push(data);
      }

      // Ordenar por nombre de alumno
      parsedList.sort((a, b) =>
        (a.estudiante.alumno || '').localeCompare(b.estudiante.alumno || '')
      );

      setBoletines((prev) => {
        const existingNames = new Set(prev.map((b) => b.estudiante.alumno || b.fileName));
        const newOnes = parsedList.filter((b) => !existingNames.has(b.estudiante.alumno || b.fileName));
        return [...prev, ...newOnes];
      });
    } catch (err) {
      console.error('Error al procesar PDFs:', err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const is2doCiclo = useMemo(() => {
    if (forcedCiclo === '1er Ciclo') return false;
    if (forcedCiclo === '2do Ciclo') return true;
    return detectIs2doCiclo(boletines);
  }, [boletines, forcedCiclo]);

  const headers = useMemo(() => getCsvHeaderList(is2doCiclo), [is2doCiclo]);

  const filteredBoletines = useMemo(() => {
    if (!searchFilter.trim()) return boletines;
    const q = searchFilter.toLowerCase();
    return boletines.filter(
      (b) =>
        b.estudiante.alumno.toLowerCase().includes(q) ||
        b.estudiante.dni.includes(q)
    );
  }, [boletines, searchFilter]);

  const csvContent = useMemo(() => {
    if (boletines.length === 0) return '';
    return generateFullCsv(
      boletines,
      selectedBimestre,
      forcedCiclo === 'auto' ? undefined : forcedCiclo
    );
  }, [boletines, selectedBimestre, forcedCiclo]);

  // TSV para pegar directamente en Google Sheets o Excel con Ctrl+V
  const tsvContent = useMemo(() => {
    if (boletines.length === 0) return '';
    return generateFullTsv(
      boletines,
      selectedBimestre,
      forcedCiclo === 'auto' ? undefined : forcedCiclo
    );
  }, [boletines, selectedBimestre, forcedCiclo]);

  const handleDownload = () => {
    if (!csvContent) return;
    const grado = boletines[0]?.estudiante?.grado
      ? `${boletines[0].estudiante.grado.replace(/\s+/g, '_')}_`
      : '';
    const seccion = boletines[0]?.estudiante?.seccion
      ? `${boletines[0].estudiante.seccion}_`
      : '';
    const filename = `calificaciones_${grado}${seccion}bimestre_${selectedBimestre}.csv`;
    downloadCsvFile(csvContent, filename);
  };

  const handleCopy = async () => {
    if (!csvContent) return;
    try {
      await navigator.clipboard.writeText(csvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Error al copiar CSV:', err);
    }
  };

  const handleCopyTsv = async () => {
    if (!tsvContent) return;
    try {
      await navigator.clipboard.writeText(tsvContent);
      setCopiedTsv(true);
      setTimeout(() => setCopiedTsv(false), 2200);
    } catch (err) {
      console.error('Error al copiar TSV para Sheets:', err);
    }
  };

  const handleClear = () => {
    setBoletines([]);
    setSearchFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Exportador de Calificaciones a CSV
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Nuevo Módulo
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Genera planillas planas para alimentar sistemas y planillas de cálculo (criterios, notas, PPI, asistencias y observaciones).
            </p>
          </div>
        </div>

        {boletines.length > 0 && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleCopyTsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all shadow-sm active:scale-95"
              title="Copia en formato de tabla para pegar con Ctrl+V directamente en Google Sheets o Excel sin desfasaje"
            >
              {copiedTsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
              {copiedTsv ? '¡Copiado para Sheets!' : 'Copiar para Sheets (Pegar Directo)'}
            </button>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all shadow-sm active:scale-95"
              title="Copia el texto plano en formato CSV"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copied ? '¡Copiado!' : 'Copiar CSV'}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md hover:shadow-indigo-500/25 active:scale-95"
            >
              <Download className="w-4 h-4" />
              Descargar CSV
            </button>

            <button
              onClick={handleClear}
              title="Limpiar alumnos"
              className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all shadow-sm active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Selector de Bimestre y Ciclo */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Selector de Bimestre */}
        <div className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Bimestre a Exportar
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Selecciona qué columna de calificaciones y asistencias se extrae
              </span>
            </div>
          </div>

          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 shadow-inner">
            {[1, 2, 3, 4].map((bim) => (
              <button
                key={bim}
                onClick={() => setSelectedBimestre(bim)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedBimestre === bim
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {bim}° Bimestre
              </button>
            ))}
          </div>
        </div>

        {/* Ciclo y Configuración */}
        <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Estructura Detectada
            </span>
            <span className="text-xs font-semibold text-slate-200 block mt-0.5">
              {is2doCiclo ? '2do Ciclo (11 materias)' : '1er Ciclo (10 materias)'}
            </span>
          </div>

          <select
            value={forcedCiclo}
            onChange={(e) => setForcedCiclo(e.target.value as any)}
            className="text-xs font-semibold bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="auto">Auto (Detección)</option>
            <option value="1er Ciclo">1er Ciclo</option>
            <option value="2do Ciclo">2do Ciclo</option>
          </select>
        </div>
      </div>

      {/* Carga de Archivos */}
      {boletines.length === 0 ? (
        <div className="bg-slate-900/60 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-12 text-center transition-all">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/20 shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Carga uno o varios boletines PDF
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Puedes subir los boletines de un alumno individual o seleccionar en lote todos los archivos del curso.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95">
              <UploadCloud className="w-4 h-4" />
              <span>Seleccionar Archivos PDF</span>
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>

            {isProcessing && (
              <div className="text-xs text-indigo-400 font-semibold animate-pulse pt-2">
                Analizando estructura y extrayendo notas...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barra de control sobre la tabla */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-200">
                {boletines.length} {boletines.length === 1 ? 'boletín cargado' : 'boletines cargados'}
              </span>
              <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold border border-slate-700">
                {headers.length} columnas
              </span>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar alumno..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer shadow-sm transition-all">
                <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                <span>Agregar más</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowRawCsv(!showRawCsv)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium shadow-sm transition-all ${
                  showRawCsv
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                {showRawCsv ? 'Ver Tabla' : 'Ver Texto CSV'}
              </button>
            </div>
          </div>

          {/* Vista previa en texto plano si está activado */}
          {showRawCsv ? (
            <div className="bg-slate-950 rounded-2xl p-5 shadow-inner border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[500px]">
              <pre className="whitespace-pre">{csvContent}</pre>
            </div>
          ) : (
            /* Vista previa interactiva de la tabla */
            <div className="bg-slate-900 rounded-2xl shadow-md border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto max-h-[550px] relative">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950 sticky top-0 z-20 border-b border-slate-800 shadow-sm">
                    <tr>
                      {headers.map((h, idx) => (
                        <th
                          key={h}
                          className={`px-3 py-2.5 font-bold text-slate-400 whitespace-nowrap border-r border-slate-800/80 uppercase tracking-wider text-[10px] ${
                            idx === 0
                              ? 'sticky left-0 bg-slate-950 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] text-slate-200'
                              : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredBoletines.map((boletin, rIdx) => {
                      const values = getBoletinCsvValues(boletin, selectedBimestre, is2doCiclo);
                      return (
                        <tr
                          key={boletin.fileName + rIdx}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          {values.map((v, cIdx) => {
                            const isName = cIdx === 0;
                            const isObs = cIdx === values.length - 1;

                            // Formato de insignias para notas
                            let badgeStyle = 'text-slate-400';
                            if (v === 'AL') badgeStyle = 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-1.5 py-0.5 rounded text-[11px]';
                            else if (v === 'AV') badgeStyle = 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 px-1.5 py-0.5 rounded text-[11px]';
                            else if (v === 'DE') badgeStyle = 'bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20 px-1.5 py-0.5 rounded text-[11px]';
                            else if (v === 'EP') badgeStyle = 'bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 px-1.5 py-0.5 rounded text-[11px]';
                            else if (v === 'NC') badgeStyle = 'bg-slate-800 text-slate-400 font-semibold border border-slate-700 px-1.5 py-0.5 rounded text-[11px]';
                            else if (v === 'SI') badgeStyle = 'bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 px-1.5 py-0.5 rounded text-[11px]';
                            else if (v === 'NO') badgeStyle = 'text-slate-500 font-medium text-[11px]';
                            else if (/^\d+$/.test(v) && !isObs && cIdx > 0 && cIdx < values.length - 4) {
                              // Calificación numérica (2do ciclo)
                              badgeStyle = 'bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/30 px-2 py-0.5 rounded text-[11px]';
                            }

                            return (
                              <td
                                key={cIdx}
                                className={`px-3 py-2 whitespace-nowrap border-r border-slate-800/40 ${
                                  isName
                                    ? 'sticky left-0 bg-slate-900 font-bold text-slate-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.4)]'
                                    : 'text-center'
                                }`}
                              >
                                {isName ? (
                                  <span>{v}</span>
                                ) : isObs ? (
                                  <span className="text-slate-300 max-w-xs truncate block text-left text-[11px]" title={v}>
                                    {v || '-'}
                                  </span>
                                ) : (
                                  <span className={badgeStyle}>{v || '-'}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
