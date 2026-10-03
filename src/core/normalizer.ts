import type { NormalizationConfig } from '../types/comparison';

export function cleanText(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/\b(\w+)\s+(fi\w*)\b/gi, '$1$2')
    .replace(/fi\s*/g, 'fi')
    .replace(/fl\s*/g, 'fl')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015_]/g, '-')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeStudentName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s*,\s*/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function areNamesEquivalent(
  nameA: string | null | undefined,
  nameB: string | null | undefined,
  config: NormalizationConfig
): boolean {
  if (!nameA && !nameB) return true;
  if (!nameA || !nameB) return false;

  if (areEquivalent(nameA, nameB, config)) return true;

  if (config.flexibleStudentNames) {
    const normA = normalizeStudentName(nameA);
    const normB = normalizeStudentName(nameB);

    if (normA === normB) return true;

    const wordsA = normA.split(' ').filter(Boolean).sort();
    const wordsB = normB.split(' ').filter(Boolean).sort();

    if (wordsA.length === wordsB.length && wordsA.every((w, idx) => w === wordsB[idx])) {
      return true;
    }

    if (wordsA.length >= 2 && wordsB.length >= 2) {
      const isASubsetOfB = wordsA.every((w) => wordsB.includes(w));
      const isBSubsetOfA = wordsB.every((w) => wordsA.includes(w));
      if (isASubsetOfB || isBSubsetOfA) {
        return true;
      }
    }
  }

  return false;
}

export function normalizeValue(
  val: string | null | undefined,
  config: NormalizationConfig
): string {
  if (val === null || val === undefined) return '';
  let s = cleanText(val);

  if (config.ignoreWhitespace) {
    s = s.replace(/\s+/g, ' ').trim();
  }

  // Canonicalize "NO CORRESPONDE A LA PLANIFICACIÓN DEL BIMESTRE"
  if (/CORRESPONDE\s+A\s+LA\s+PLANIFICACI[ÓO]N/i.test(s)) {
    return 'NO CORRESPONDE A LA PLANIFICACIÓN DEL BIMESTRE';
  }

  // Dashes / Empty indicators
  if (config.normalizeDashes) {
    if (s === '---' || s === '--' || s === '-' || s === '—' || s === '- - -' || s === '_') {
      return '';
    }
  }

  // Zero as empty if configured
  if (config.zeroAsEmpty && s === '0') {
    return '';
  }

  // Case normalization
  if (config.ignoreCase) {
    const lower = s.toLowerCase();
    if (lower === 'no') return 'NO';
    if (lower === 'si' || lower === 'sí') return 'SI';
    s = s.toLowerCase();
  }

  // Accents
  if (config.normalizeAccents) {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Punctuation
  if (config.ignorePunctuation) {
    s = s.replace(/[.,:;]$/, '').trim();
  }

  return s;
}

export function areEquivalent(
  a: string | null | undefined,
  b: string | null | undefined,
  config: NormalizationConfig
): boolean {
  const normA = normalizeValue(a, config);
  const normB = normalizeValue(b, config);
  return normA === normB;
}
