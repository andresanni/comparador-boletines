import React from 'react';
import { Calendar, Check } from 'lucide-react';

interface BimestreSelectorProps {
  activeBimestres: number[];
  onChange: (bims: number[]) => void;
}

export const BimestreSelector: React.FC<BimestreSelectorProps> = ({
  activeBimestres,
  onChange,
}) => {
  const toggleBimestre = (bim: number) => {
    if (activeBimestres.includes(bim)) {
      // Don't allow deselecting all bimestres (keep at least 1)
      if (activeBimestres.length === 1) return;
      onChange(activeBimestres.filter((b) => b !== bim).sort((a, b) => a - b));
    } else {
      onChange([...activeBimestres, bim].sort((a, b) => a - b));
    }
  };

  const setPreset = (bims: number[]) => {
    onChange(bims);
  };

  const isAllActive = activeBimestres.length === 4;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
      {/* Title & Active Description */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Bimestres a Auditar
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
              {activeBimestres.length === 4
                ? 'Todos (1° al 4°)'
                : activeBimestres.map((b) => `${b}°`).join(', ')}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Reduce la auditoría a bimestres específicos para omitir diferencias ya corregidas o conocidas en periodos previos.
          </p>
        </div>
      </div>

      {/* Controls: Individual Pills + Presets */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">
        {/* Individual Bimestre Toggle Buttons */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800/80 p-1 rounded-xl gap-1">
          {[1, 2, 3, 4].map((bim) => {
            const isActive = activeBimestres.includes(bim);
            return (
              <button
                key={`bim-btn-${bim}`}
                type="button"
                onClick={() => toggleBimestre(bim)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={`Alternar ${bim}° Bimestre`}
              >
                {isActive && <Check className="w-3 h-3" />}
                {bim}° Bim
              </button>
            );
          })}
        </div>

        {/* Quick Presets Menu */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPreset([1, 2, 3, 4])}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition ${
              isAllActive
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setPreset([2])}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition ${
              activeBimestres.length === 1 && activeBimestres[0] === 2
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 font-semibold'
                : 'text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Solo 2°
          </button>
          <button
            type="button"
            onClick={() => setPreset([1, 2])}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition ${
              activeBimestres.length === 2 && activeBimestres.includes(1) && activeBimestres.includes(2)
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 font-semibold'
                : 'text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Hasta 2°
          </button>
        </div>
      </div>
    </div>
  );
};
