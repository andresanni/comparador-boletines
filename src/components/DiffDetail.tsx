import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Filter,
} from 'lucide-react';
import type { ComparisonResult } from '../types/comparison';
import { areEquivalent } from '../core/normalizer';
import { DEFAULT_NORMALIZATION } from '../types/comparison';

interface DiffDetailProps {
  result: ComparisonResult;
}

export const DiffDetail: React.FC<DiffDetailProps> = ({ result }) => {
  const [onlyDiffs, setOnlyDiffs] = useState<boolean>(!result.isMatch);

  const { manualData, appData, differences } = result;

  const exportStudentJson = () => {
    const jsonStr = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${result.studentDni || 'alumno'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col h-[calc(100vh-220px)] min-h-[580px] overflow-hidden shadow-xl">
      {/* Student Top Bar */}
      <div className="pb-4 border-b border-slate-800 shrink-0 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-white truncate" title={result.studentName}>
              {result.studentName}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                DNI: {result.studentDni}
              </span>
              {result.grado && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                  {result.grado} {result.seccion}
                </span>
              )}
              {result.ciclo && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                  {result.ciclo}
                </span>
              )}
              {(result.manualData?.materias.length || result.appData?.materias.length) && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700">
                  {result.manualData?.materias.length || result.appData?.materias.length} materias
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer hover:bg-slate-700/80 transition shadow-sm">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <input
                type="checkbox"
                checked={onlyDiffs}
                onChange={(e) => setOnlyDiffs(e.target.checked)}
                className="rounded border-slate-600 text-indigo-600 bg-slate-900 focus:ring-0"
              />
              <span>Ver sólo diferencias</span>
            </label>
            <button
              onClick={exportStudentJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-700/80 transition shadow-sm"
              title="Exportar auditoría a JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              Exportar
            </button>
          </div>
        </div>

        {/* File references bar */}
        <div className="flex items-center gap-4 text-[11px] text-slate-400 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/60 flex-wrap">
          <div className="flex items-center gap-1.5 truncate max-w-sm">
            <span className="text-slate-500 font-mono text-[10px]">MANUAL:</span>
            <span className="text-slate-300 truncate" title={result.manualFile}>{result.manualFile}</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5 truncate max-w-sm">
            <span className="text-slate-500 font-mono text-[10px]">APP:</span>
            <span className="text-slate-300 truncate" title={result.appFile}>{result.appFile}</span>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div className="my-4 shrink-0">
        {result.isMatch ? (
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold">¡Integridad 100% Verificada!</p>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">
                Todas las calificaciones, PPIs, asistencias y observaciones coinciden exactamente con el boletín manual.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold">
                Se detectaron {differences.length} discrepancias en este boletín
              </p>
              <p className="text-[11px] text-rose-400/80 mt-0.5">
                Revisa los campos resaltados en rojo a continuación.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {/* If Only Diffs is active and there are diffs, show the summary list first */}
        {differences.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Lista de Discrepancias ({differences.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Comparación directa de celdas
              </span>
            </div>

            <div className="space-y-2.5">
              {differences.map((diff) => (
                <div
                  key={diff.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition text-xs shadow-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {diff.subject && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold text-[11px]">
                          {diff.subject}
                        </span>
                      )}
                      {diff.bimestre && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] border border-slate-700/60">
                          {diff.bimestre}° Bim.
                        </span>
                      )}
                      <span className="font-medium text-slate-200">
                        {diff.item}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                      {diff.category}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono mb-1">
                        <span>Manual (Original)</span>
                      </div>
                      <div className="text-amber-300 font-mono font-medium text-xs break-words">
                        {diff.valueManual}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/30">
                      <div className="flex items-center justify-between text-[10px] text-rose-400 uppercase font-mono mb-1">
                        <span>App (Generado)</span>
                        <span className="text-[10px] text-rose-400 font-semibold">Discrepancia</span>
                      </div>
                      <div className="text-rose-300 font-mono font-bold text-xs break-words">
                        {diff.valueApp}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Full Subject Tables (if not onlyDiffs, or if looking at whole subject) */}
        {!onlyDiffs && manualData && appData && (
          <div className="space-y-6">
            {/* Materias */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Materias y Criterios de Evaluación
              </h3>

              {manualData.materias.map((mMan, mIdx) => {
                const mApp = appData.materias.find(
                  (m) =>
                    m.nombre.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() ===
                    mMan.nombre.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
                );

                const ppiMatch = mApp
                  ? areEquivalent(mMan.ppi, mApp.ppi, DEFAULT_NORMALIZATION)
                  : false;

                return (
                  <div
                    key={`materia-${mIdx}`}
                    className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50"
                  >
                    {/* Header */}
                    <div className="bg-slate-900/80 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-200">{mMan.nombre}</span>
                      {mMan.ppi && (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                            ppiMatch
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          PPI: {mMan.ppi} {mApp && mApp.ppi !== mMan.ppi ? `(App: ${mApp.ppi})` : ''}
                        </span>
                      )}
                    </div>

                    {/* Table */}
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-[11px] text-slate-400 bg-slate-900/40">
                          <th className="py-2 px-3">Criterio / Calificación</th>
                          <th className="py-2 px-3 text-center w-28">1° Bimestre</th>
                          <th className="py-2 px-3 text-center w-28">2° Bimestre</th>
                          <th className="py-2 px-3 text-center w-28">3° Bimestre</th>
                          <th className="py-2 px-3 text-center w-28">4° Bimestre</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {mMan.criterios.map((cMan, cIdx) => {
                          const cApp = mApp?.criterios[cIdx];
                          return (
                            <tr key={`crit-${cIdx}`} className="hover:bg-slate-900/30">
                              <td className="py-2 px-3 text-slate-300 text-[11px]">
                                {cMan.label}
                              </td>
                              {[0, 1, 2, 3].map((b) => {
                                const valMan = cMan.bimestres[b] || '';
                                const valApp = cApp ? cApp.bimestres[b] || '' : '';
                                const match = areEquivalent(valMan, valApp, DEFAULT_NORMALIZATION);

                                return (
                                  <td
                                    key={`col-${b}`}
                                    className={`py-2 px-3 text-center font-mono text-[11px] ${
                                      match
                                        ? 'text-slate-400'
                                        : 'bg-rose-950/40 text-rose-300 font-bold border-x border-rose-500/30'
                                    }`}
                                  >
                                    {match ? (
                                      valMan || '-'
                                    ) : (
                                      <div>
                                        <div className="text-amber-300 line-through text-[10px]">
                                          {valMan || '(Vacío)'}
                                        </div>
                                        <div className="text-rose-400">{valApp || '(Vacío)'}</div>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}

                        {/* Calificación General */}
                        {mMan.calificacionGeneral && (
                          <tr className="bg-slate-900/60 font-semibold border-t border-slate-800">
                            <td className="py-2 px-3 text-indigo-300 text-[11px]">
                              CALIFICACIÓN GENERAL
                            </td>
                            {[0, 1, 2, 3].map((b) => {
                              const valMan = mMan.calificacionGeneral![b] || '';
                              const valApp = mApp?.calificacionGeneral?.[b] || '';
                              const match = areEquivalent(valMan, valApp, DEFAULT_NORMALIZATION);

                              return (
                                <td
                                  key={`gen-${b}`}
                                  className={`py-2 px-3 text-center font-mono text-[11px] ${
                                    match
                                      ? 'text-indigo-200'
                                      : 'bg-rose-950/50 text-rose-300 font-bold border-x border-rose-500/30'
                                  }`}
                                >
                                  {match ? (
                                    valMan || '-'
                                  ) : (
                                    <div>
                                      <div className="text-amber-300 text-[10px]">{valMan}</div>
                                      <div className="text-rose-400">{valApp}</div>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* Asistencias */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Control de Asistencia por Bimestre
              </h3>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-900/40">
                      <th className="py-2 px-3">Bimestre</th>
                      <th className="py-2 px-3 text-center">Asistencias</th>
                      <th className="py-2 px-3 text-center">Inasistencias</th>
                      <th className="py-2 px-3 text-center">Llegadas Tarde</th>
                      <th className="py-2 px-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-[11px]">
                    {[0, 1, 2, 3].map((b) => {
                      const aMan = manualData.asistencias[b] || {
                        asistencias: '',
                        inasistencias: '',
                        llegadasTarde: '',
                        observaciones: '',
                      };
                      const aApp = appData.asistencias[b] || {
                        asistencias: '',
                        inasistencias: '',
                        llegadasTarde: '',
                        observaciones: '',
                      };

                      const asisMatch = areEquivalent(aMan.asistencias, aApp.asistencias, DEFAULT_NORMALIZATION);
                      const inasMatch = areEquivalent(aMan.inasistencias, aApp.inasistencias, DEFAULT_NORMALIZATION);
                      const tardeMatch = areEquivalent(aMan.llegadasTarde, aApp.llegadasTarde, DEFAULT_NORMALIZATION);
                      const obsMatch = areEquivalent(aMan.observaciones, aApp.observaciones, DEFAULT_NORMALIZATION);

                      return (
                        <tr key={`asis-${b}`}>
                          <td className="py-2 px-3 font-semibold text-slate-300">
                            {b + 1}° Bimestre
                          </td>
                          <td className={`py-2 px-3 text-center font-mono ${asisMatch ? 'text-slate-300' : 'bg-rose-950/40 text-rose-300 font-bold'}`}>
                            {asisMatch ? aMan.asistencias || '-' : `${aMan.asistencias} / ${aApp.asistencias}`}
                          </td>
                          <td className={`py-2 px-3 text-center font-mono ${inasMatch ? 'text-slate-300' : 'bg-rose-950/40 text-rose-300 font-bold'}`}>
                            {inasMatch ? aMan.inasistencias || '-' : `${aMan.inasistencias} / ${aApp.inasistencias}`}
                          </td>
                          <td className={`py-2 px-3 text-center font-mono ${tardeMatch ? 'text-slate-300' : 'bg-rose-950/40 text-rose-300 font-bold'}`}>
                            {tardeMatch ? aMan.llegadasTarde || '-' : `${aMan.llegadasTarde} / ${aApp.llegadasTarde}`}
                          </td>
                          <td className={`py-2 px-3 ${obsMatch ? 'text-slate-400' : 'bg-rose-950/40 text-rose-300 font-bold'}`}>
                            {obsMatch ? aMan.observaciones || '-' : `Manual: "${aMan.observaciones}" | App: "${aApp.observaciones}"`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cierre */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Síntesis Conceptual y Cierre Anual
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">
                    Síntesis Conceptual
                  </span>
                  <span className="text-slate-300 font-medium">
                    {manualData.cierre.sintesisConceptual || '-'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">
                    Permanece en
                  </span>
                  <span className="text-slate-300 font-medium">
                    {manualData.cierre.permaneceEn || '-'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">
                    Promovido/a a
                  </span>
                  <span className="text-slate-300 font-medium">
                    {manualData.cierre.promovidoA || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
