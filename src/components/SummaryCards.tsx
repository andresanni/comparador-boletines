import React from 'react';
import { CheckCircle2, AlertTriangle, Users, AlertCircle } from 'lucide-react';

interface SummaryCardsProps {
  total: number;
  matching: number;
  differing: number;
  unmatched: number;
  currentFilter: 'all' | 'match' | 'diff' | 'unmatched';
  onFilterChange: (filter: 'all' | 'match' | 'diff' | 'unmatched') => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  total,
  matching,
  differing,
  unmatched,
  currentFilter,
  onFilterChange,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* Total Card */}
      <button
        type="button"
        onClick={() => onFilterChange('all')}
        className={`p-4 rounded-xl border text-left transition ${
          currentFilter === 'all'
            ? 'bg-slate-800/90 border-indigo-500/50 ring-1 ring-indigo-500/50 shadow-md'
            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Total Pares</span>
          <Users className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-2xl font-bold text-slate-100">{total}</div>
        <p className="text-[11px] text-slate-400 mt-1">Alumnos auditados</p>
      </button>

      {/* Matching Card */}
      <button
        type="button"
        onClick={() => onFilterChange('match')}
        className={`p-4 rounded-xl border text-left transition ${
          currentFilter === 'match'
            ? 'bg-emerald-950/30 border-emerald-500/50 ring-1 ring-emerald-500/50 shadow-md'
            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between text-emerald-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Coincidentes</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-emerald-300">{matching}</div>
        <p className="text-[11px] text-emerald-400/80 mt-1">100% integridad verificada</p>
      </button>

      {/* Differing Card */}
      <button
        type="button"
        onClick={() => onFilterChange('diff')}
        className={`p-4 rounded-xl border text-left transition ${
          currentFilter === 'diff'
            ? 'bg-rose-950/30 border-rose-500/50 ring-1 ring-rose-500/50 shadow-md'
            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between text-rose-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Discrepancias</span>
          <AlertTriangle className="w-4 h-4 text-rose-400" />
        </div>
        <div className="text-2xl font-bold text-rose-300">{differing}</div>
        <p className="text-[11px] text-rose-400/80 mt-1">Requieren revisión</p>
      </button>

      {/* Unmatched Card */}
      <button
        type="button"
        onClick={() => onFilterChange('unmatched')}
        className={`p-4 rounded-xl border text-left transition ${
          currentFilter === 'unmatched'
            ? 'bg-amber-950/30 border-amber-500/50 ring-1 ring-amber-500/50 shadow-md'
            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between text-amber-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Sin Par</span>
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold text-amber-300">{unmatched}</div>
        <p className="text-[11px] text-amber-400/80 mt-1">Sin contraparte</p>
      </button>
    </div>
  );
};
