import type { BoletinData } from '../types/boletin';
import type { ComparisonResult, NormalizationConfig } from '../types/comparison';
import { compareBoletines } from './differ';
import { cleanText } from './normalizer';

export interface BatchComparisonSummary {
  totalPairs: number;
  matchingCount: number;
  differingCount: number;
  unmatchedManual: BoletinData[];
  unmatchedApp: BoletinData[];
  results: ComparisonResult[];
}

export function matchAndCompareBatch(
  manualList: BoletinData[],
  appList: BoletinData[],
  config?: NormalizationConfig
): BatchComparisonSummary {
  const matchedAppIndices = new Set<number>();
  const results: ComparisonResult[] = [];
  const unmatchedManual: BoletinData[] = [];

  for (const manual of manualList) {
    // 1. Try matching by DNI (if both have DNI)
    let appIndex = -1;
    if (manual.estudiante.dni) {
      appIndex = appList.findIndex(
        (app, idx) => !matchedAppIndices.has(idx) && app.estudiante.dni === manual.estudiante.dni
      );
    }

    // 2. Fallback: match by Student Name
    if (appIndex === -1 && manual.estudiante.alumno) {
      const cleanManName = cleanText(manual.estudiante.alumno).toLowerCase();
      appIndex = appList.findIndex((app, idx) => {
        if (matchedAppIndices.has(idx)) return false;
        const cleanAppName = cleanText(app.estudiante.alumno).toLowerCase();
        return cleanManName === cleanAppName || cleanAppName.includes(cleanManName) || cleanManName.includes(cleanAppName);
      });
    }

    // 3. Fallback: match by filename
    if (appIndex === -1 && manual.fileName) {
      const baseManual = manual.fileName.replace(/manual[_-]?/i, '').replace(/app[_-]?/i, '').trim();
      appIndex = appList.findIndex((app, idx) => {
        if (matchedAppIndices.has(idx)) return false;
        const baseApp = app.fileName.replace(/manual[_-]?/i, '').replace(/app[_-]?/i, '').trim();
        return baseManual === baseApp;
      });
    }

    if (appIndex !== -1) {
      matchedAppIndices.add(appIndex);
      const app = appList[appIndex];
      const comp = compareBoletines(manual, app, config);
      results.push(comp);
    } else {
      unmatchedManual.push(manual);
    }
  }

  const unmatchedApp = appList.filter((_, idx) => !matchedAppIndices.has(idx));

  const matchingCount = results.filter((r) => r.isMatch).length;
  const differingCount = results.filter((r) => !r.isMatch).length;

  return {
    totalPairs: results.length,
    matchingCount,
    differingCount,
    unmatchedManual,
    unmatchedApp,
    results,
  };
}
