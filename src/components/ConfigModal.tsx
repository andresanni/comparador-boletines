import React from 'react';
import { X, Check } from 'lucide-react';
import type { NormalizationConfig } from '../types/comparison';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: NormalizationConfig;
  onChange: (config: NormalizationConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
}) => {
  if (!isOpen) return null;

  const toggle = (key: keyof NormalizationConfig) => {
    onChange({
      ...config,
      [key]: !config[key],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Reglas de Normalización
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configura qué variaciones cosméticas no deben considerarse errores.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={config.normalizeDashes}
              onChange={() => toggle('normalizeDashes')}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
            />
            <div>
              <span className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition">
                Equivalencia de guiones y vacíos
              </span>
              <p className="text-xs text-slate-400">
                Considera equivalentes <code className="text-indigo-300">---</code>, <code className="text-indigo-300">-</code>, y celdas sin contenido.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={config.ignoreCase}
              onChange={() => toggle('ignoreCase')}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
            />
            <div>
              <span className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition">
                Ignorar mayúsculas / minúsculas (PPI y notas)
              </span>
              <p className="text-xs text-slate-400">
                Trata <code className="text-indigo-300">NO</code> y <code className="text-indigo-300">No</code>, o <code className="text-indigo-300">AVANZADO</code> y <code className="text-indigo-300">Avanzado</code> como idénticos.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={config.zeroAsEmpty}
              onChange={() => toggle('zeroAsEmpty')}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
            />
            <div>
              <span className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition">
                Tratar &quot;0&quot; como equivalente a &quot;-&quot; en asistencias vacías
              </span>
              <p className="text-xs text-slate-400">
                Ignora la discrepancia si el sistema nuevo emite <code className="text-indigo-300">-</code> y el anterior tenía <code className="text-indigo-300">0</code> (o viceversa).
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={config.ignoreWhitespace}
              onChange={() => toggle('ignoreWhitespace')}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
            />
            <div>
              <span className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition">
                Colapsar saltos de línea y espacios
              </span>
              <p className="text-xs text-slate-400">
                Une calificaciones de 2 líneas (ej. <code className="text-indigo-300">&quot;AVANZADO\n8&quot;</code> a <code className="text-indigo-300">&quot;AVANZADO 8&quot;</code>).
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={config.ignorePunctuation}
              onChange={() => toggle('ignorePunctuation')}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
            />
            <div>
              <span className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition">
                Ignorar puntuación final
              </span>
              <p className="text-xs text-slate-400">
                Ignora puntos al final de frases en las observaciones.
              </p>
            </div>
          </label>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            Guardar y Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
