import React, { useState } from 'react';
import { Search, ChevronRight, CheckCircle2, AlertTriangle, FileQuestion } from 'lucide-react';
import type { ComparisonResult } from '../types/comparison';
import type { BoletinData } from '../types/boletin';

interface StudentListProps {
  results: ComparisonResult[];
  unmatchedManual: BoletinData[];
  unmatchedApp: BoletinData[];
  selectedId: string | null;
  onSelect: (result: ComparisonResult) => void;
  filter: 'all' | 'match' | 'diff' | 'unmatched';
}

export const StudentList: React.FC<StudentListProps> = ({
  results,
  unmatchedManual,
  unmatchedApp,
  selectedId,
  onSelect,
  filter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredResults = results.filter((r) => {
    // Tab filter
    if (filter === 'match' && !r.isMatch) return false;
    if (filter === 'diff' && r.isMatch) return false;

    // Search query
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.studentName.toLowerCase().includes(term) ||
      r.studentDni.includes(term) ||
      r.grado.toLowerCase().includes(term) ||
      r.manualFile.toLowerCase().includes(term) ||
      r.appFile.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col h-[700px]">
      {/* Search Header */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por DNI, Alumno o Archivo..."
          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredResults.map((res) => {
          const isSelected = selectedId === res.id;
          const diffCount = res.differences.length;

          return (
            <div
              key={res.id}
              onClick={() => onSelect(res)}
              className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500/60 shadow-sm'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {res.studentName}
                  </span>
                  {res.grado && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {res.grado} {res.seccion}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                  <span>DNI: {res.studentDni}</span>
                  <span>•</span>
                  <span className="truncate text-slate-500 text-[10px]" title={res.manualFile}>
                    {res.manualFile}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {res.isMatch ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    {diffCount} {diffCount === 1 ? 'diferencia' : 'diferencias'}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          );
        })}

        {filteredResults.length === 0 && filter !== 'unmatched' && (
          <div className="text-center py-12 text-slate-500 text-xs">
            No se encontraron alumnos con los criterios seleccionados.
          </div>
        )}

        {/* Unmatched files view when filter is 'unmatched' or 'all' */}
        {(filter === 'unmatched' || filter === 'all') &&
          (unmatchedManual.length > 0 || unmatchedApp.length > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <FileQuestion className="w-3.5 h-3.5" />
                Archivos Sin Pareja ({unmatchedManual.length + unmatchedApp.length})
              </h4>
              {unmatchedManual.map((m, idx) => (
                <div
                  key={`un-man-${idx}`}
                  className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-950/10 text-xs text-amber-300"
                >
                  <p className="font-medium">Manual sin par: {m.estudiante.alumno || m.fileName}</p>
                  <p className="text-[10px] text-amber-400/70 mt-0.5">DNI: {m.estudiante.dni || 'Desconocido'}</p>
                </div>
              ))}
              {unmatchedApp.map((a, idx) => (
                <div
                  key={`un-app-${idx}`}
                  className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-950/10 text-xs text-amber-300"
                >
                  <p className="font-medium">App sin par: {a.estudiante.alumno || a.fileName}</p>
                  <p className="text-[10px] text-amber-400/70 mt-0.5">DNI: {a.estudiante.dni || 'Desconocido'}</p>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};
