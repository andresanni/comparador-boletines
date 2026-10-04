import React from 'react';
import { Sliders, RefreshCw, FileCheck, FileSpreadsheet, GitCompare } from 'lucide-react';

interface HeaderProps {
  activeTab: 'auditor' | 'exporter';
  onTabChange: (tab: 'auditor' | 'exporter') => void;
  onOpenSettings: () => void;
  onReset: () => void;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
  onReset,
  hasData,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shadow-sm">
            <FileCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Auditor de Boletines
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.1
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Verificador de integridad & Exportador a CSV
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => onTabChange('auditor')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'auditor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Auditoría & Comparador</span>
          </button>

          <button
            onClick={() => onTabChange('exporter')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'exporter'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportador a CSV</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'auditor' && hasData && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
              title="Limpiar y cargar nuevos archivos"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reiniciar</span>
            </button>
          )}

          {activeTab === 'auditor' && (
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
              title="Ajustar reglas de normalización"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reglas de equivalencia</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
