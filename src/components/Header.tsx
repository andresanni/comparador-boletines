import React from 'react';
import { Sliders, RefreshCw, FileCheck } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onReset: () => void;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onReset, hasData }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
            <FileCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Auditor de Boletines
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Verificador de integridad: Manuales vs. App Generada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasData && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
              title="Limpiar y cargar nuevos archivos"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reiniciar
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
            title="Ajustar reglas de normalización"
          >
            <Sliders className="w-3.5 h-3.5" />
            Reglas de equivalencia
          </button>
        </div>
      </div>
    </header>
  );
};
