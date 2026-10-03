import { useState } from 'react';
import { Header } from './components/Header';
import { ConfigModal } from './components/ConfigModal';
import { DropZone } from './components/DropZone';
import { SummaryCards } from './components/SummaryCards';
import { StudentList } from './components/StudentList';
import { DiffDetail } from './components/DiffDetail';
import { parseBoletinPDF } from './core/parser';
import { matchAndCompareBatch } from './core/batchMatcher';
import type { BatchComparisonSummary } from './core/batchMatcher';
import type { ComparisonResult, NormalizationConfig } from './types/comparison';
import { DEFAULT_NORMALIZATION } from './types/comparison';
import type { BoletinData } from './types/boletin';
import { Download } from 'lucide-react';

export function App() {
  const [manualFiles, setManualFiles] = useState<File[]>([]);
  const [appFiles, setAppFiles] = useState<File[]>([]);
  const [manualDataList, setManualDataList] = useState<BoletinData[]>([]);
  const [appDataList, setAppDataList] = useState<BoletinData[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [summary, setSummary] = useState<BatchComparisonSummary | null>(null);
  const [selectedResult, setSelectedResult] = useState<ComparisonResult | null>(null);
  const [filter, setFilter] = useState<'all' | 'match' | 'diff' | 'unmatched'>('all');
  const [config, setConfig] = useState<NormalizationConfig>(DEFAULT_NORMALIZATION);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Quick Sample Loader
  const handleLoadSamples = async () => {
    setIsProcessing(true);
    setProgressText('Cargando boletines de prueba...');
    try {
      const [resMan, resApp] = await Promise.all([
        fetch('/samples/boletin_manual.pdf'),
        fetch('/samples/boletin_app.pdf'),
      ]);

      const [bufMan, bufApp] = await Promise.all([
        resMan.arrayBuffer(),
        resApp.arrayBuffer(),
      ]);

      const fileMan = new File([bufMan], 'boletin_manual_santina.pdf', { type: 'application/pdf' });
      const fileApp = new File([bufApp], 'boletin_app_santina.pdf', { type: 'application/pdf' });

      setManualFiles([fileMan]);
      setAppFiles([fileApp]);

      setProgressText('Analizando boletín manual...');
      const manData = await parseBoletinPDF(bufMan, fileMan.name);

      setProgressText('Analizando boletín app...');
      const appData = await parseBoletinPDF(bufApp, fileApp.name);

      setManualDataList([manData]);
      setAppDataList([appData]);

      setProgressText('Comparando integridad...');
      const batchSummary = matchAndCompareBatch([manData], [appData], config);
      setSummary(batchSummary);
      if (batchSummary.results.length > 0) {
        setSelectedResult(batchSummary.results[0]);
      }
    } catch (err) {
      console.error(err);
      alert('Error al cargar las muestras de prueba.');
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  // Full Batch Processing
  const handleStartComparison = async () => {
    if (manualFiles.length === 0 || appFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const parsedManual: BoletinData[] = [];
      for (let i = 0; i < manualFiles.length; i++) {
        const file = manualFiles[i];
        setProgressText(`Procesando manuales: ${i + 1} de ${manualFiles.length} (${file.name})...`);
        const buf = await file.arrayBuffer();
        const data = await parseBoletinPDF(buf, file.name);
        parsedManual.push(data);
      }

      const parsedApp: BoletinData[] = [];
      for (let i = 0; i < appFiles.length; i++) {
        const file = appFiles[i];
        setProgressText(`Procesando app: ${i + 1} de ${appFiles.length} (${file.name})...`);
        const buf = await file.arrayBuffer();
        const data = await parseBoletinPDF(buf, file.name);
        parsedApp.push(data);
      }

      setManualDataList(parsedManual);
      setAppDataList(parsedApp);

      setProgressText('Emparejando alumnos y comparando diferencias...');
      const batchSummary = matchAndCompareBatch(parsedManual, parsedApp, config);
      setSummary(batchSummary);

      // Select first differing, or first result
      const firstDiff = batchSummary.results.find((r) => !r.isMatch);
      setSelectedResult(firstDiff || batchSummary.results[0] || null);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error durante el análisis de los PDFs.');
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  // Re-run diff if configuration is updated
  const handleConfigChange = (newConfig: NormalizationConfig) => {
    setConfig(newConfig);
    if (manualDataList.length > 0 && appDataList.length > 0) {
      const batchSummary = matchAndCompareBatch(manualDataList, appDataList, newConfig);
      setSummary(batchSummary);
      if (selectedResult) {
        const updated = batchSummary.results.find((r) => r.studentDni === selectedResult.studentDni);
        setSelectedResult(updated || batchSummary.results[0] || null);
      }
    }
  };

  const handleReset = () => {
    setManualFiles([]);
    setAppFiles([]);
    setManualDataList([]);
    setAppDataList([]);
    setSummary(null);
    setSelectedResult(null);
    setFilter('all');
  };

  const exportAllAuditCsv = () => {
    if (!summary) return;
    const rows = [
      ['DNI', 'Alumno', 'Grado', 'Seccion', 'Estado', 'Discrepancias_Total', 'Detalle_Discrepancias'],
    ];

    for (const r of summary.results) {
      const details = r.differences
        .map((d) => `[${d.category}] ${d.subject ? d.subject + ': ' : ''}${d.item} (Manual: ${d.valueManual} vs App: ${d.valueApp})`)
        .join('; ');
      rows.push([
        r.studentDni,
        `"${r.studentName}"`,
        `"${r.grado}"`,
        `"${r.seccion}"`,
        r.isMatch ? 'OK' : 'ERROR',
        String(r.differences.length),
        `"${details}"`,
      ]);
    }

    const csvContent = rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_auditoria_boletines_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        onOpenSettings={() => setIsConfigOpen(true)}
        onReset={handleReset}
        hasData={!!summary}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* If no comparison summary yet, show upload Dropzone */}
        {!summary ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Auditoría y Comparador de Boletines
              </h2>
              <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
                Carga los boletines manuales originales y los generados por la app para verificar
                automáticamente notas, PPIs, asistencias y observaciones.
              </p>
            </div>

            <DropZone
              manualFiles={manualFiles}
              appFiles={appFiles}
              onManualFilesSelected={(files) => setManualFiles((prev) => [...prev, ...files])}
              onAppFilesSelected={(files) => setAppFiles((prev) => [...prev, ...files])}
              onLoadSamples={handleLoadSamples}
              onStartComparison={handleStartComparison}
              isProcessing={isProcessing}
              progressText={progressText}
            />
          </div>
        ) : (
          /* Results Dashboard */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Action Bar & Summary Cards */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Resultados de la Auditoría</h2>
                <p className="text-xs text-slate-400">
                  {summary.totalPairs} alumnos auditados • {summary.matchingCount} coinciden al 100% •{' '}
                  {summary.differingCount} con discrepancias
                </p>
              </div>
              <button
                onClick={exportAllAuditCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 shadow-sm transition"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                Descargar Reporte Completo (CSV)
              </button>
            </div>

            <SummaryCards
              total={summary.totalPairs}
              matching={summary.matchingCount}
              differing={summary.differingCount}
              unmatched={summary.unmatchedManual.length + summary.unmatchedApp.length}
              currentFilter={filter}
              onFilterChange={(f) => setFilter(f)}
            />

            {/* Split View: List on left, Diff Details on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5">
                <StudentList
                  results={summary.results}
                  unmatchedManual={summary.unmatchedManual}
                  unmatchedApp={summary.unmatchedApp}
                  selectedId={selectedResult?.id || null}
                  onSelect={(res) => setSelectedResult(res)}
                  filter={filter}
                />
              </div>

              <div className="lg:col-span-7">
                {selectedResult ? (
                  <DiffDetail result={selectedResult} />
                ) : (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
                    Selecciona un alumno de la lista para inspeccionar el detalle.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onChange={handleConfigChange}
      />
    </div>
  );
}

export default App;
