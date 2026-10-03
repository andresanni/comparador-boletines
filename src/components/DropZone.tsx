import React, { useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Play, Sparkles } from 'lucide-react';

interface DropZoneProps {
  manualFiles: File[];
  appFiles: File[];
  onManualFilesSelected: (files: File[]) => void;
  onAppFilesSelected: (files: File[]) => void;
  onLoadSamples: () => void;
  onStartComparison: () => void;
  isProcessing: boolean;
  progressText: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  manualFiles,
  appFiles,
  onManualFilesSelected,
  onAppFilesSelected,
  onLoadSamples,
  onStartComparison,
  isProcessing,
  progressText,
}) => {
  const manualInputRef = useRef<HTMLInputElement>(null);
  const appInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent, target: 'manual' | 'app') => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const pdfs = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.toLowerCase().endsWith('.pdf')
      );
      if (target === 'manual') onManualFilesSelected(pdfs);
      else onAppFilesSelected(pdfs);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'manual' | 'app') => {
    if (e.target.files && e.target.files.length > 0) {
      const pdfs = Array.from(e.target.files).filter((f) =>
        f.name.toLowerCase().endsWith('.pdf')
      );
      if (target === 'manual') onManualFilesSelected(pdfs);
      else onAppFilesSelected(pdfs);
    }
  };

  const canCompare = manualFiles.length > 0 && appFiles.length > 0 && !isProcessing;

  return (
    <div className="space-y-6">
      {/* Quick sample bar */}
      <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-200">
              Prueba rápida con los boletines de muestra
            </p>
            <p className="text-[11px] text-indigo-300/70">
              Carga los 2 boletines de prueba (Manual vs App) para probar el analizador al instante.
            </p>
          </div>
        </div>
        <button
          onClick={onLoadSamples}
          disabled={isProcessing}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-sm transition whitespace-nowrap"
        >
          Cargar Muestras
        </button>
      </div>

      {/* Dual Dropzone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado Manual */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'manual')}
          onClick={() => manualInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[220px] ${
            manualFiles.length > 0
              ? 'border-indigo-500/50 bg-indigo-950/10 hover:border-indigo-400'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
          }`}
        >
          <input
            ref={manualInputRef}
            type="file"
            multiple
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleInputChange(e, 'manual')}
          />
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 mb-3 shadow-inner">
            {manualFiles.length > 0 ? (
              <CheckCircle2 className="w-6 h-6 text-indigo-400" />
            ) : (
              <UploadCloud className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            Boletines Manuales (Originales)
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Arrastra uno o varios PDFs, o haz clic para explorar.
          </p>
          {manualFiles.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              {manualFiles.length} {manualFiles.length === 1 ? 'archivo cargado' : 'archivos cargados'}
            </div>
          )}
        </div>

        {/* Lado App */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'app')}
          onClick={() => appInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[220px] ${
            appFiles.length > 0
              ? 'border-emerald-500/50 bg-emerald-950/10 hover:border-emerald-400'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
          }`}
        >
          <input
            ref={appInputRef}
            type="file"
            multiple
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleInputChange(e, 'app')}
          />
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 mb-3 shadow-inner">
            {appFiles.length > 0 ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : (
              <UploadCloud className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            Boletines App Nueva (A Verificar)
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Arrastra los PDFs emitidos por tu motor nuevo.
          </p>
          {appFiles.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              {appFiles.length} {appFiles.length === 1 ? 'archivo cargado' : 'archivos cargados'}
            </div>
          )}
        </div>
      </div>

      {/* Start Button & Progress */}
      <div className="flex flex-col items-center justify-center pt-2">
        <button
          onClick={onStartComparison}
          disabled={!canCompare}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition shadow-lg ${
            canCompare
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-600/25 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          {isProcessing ? 'Analizando boletines...' : 'Comenzar Comparación y Auditoría'}
        </button>
        {isProcessing && (
          <p className="text-xs text-indigo-400 mt-2.5 animate-pulse font-medium">
            {progressText || 'Procesando documentos...'}
          </p>
        )}
      </div>
    </div>
  );
};
