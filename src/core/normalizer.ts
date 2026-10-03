import type { NormalizationConfig } from '../types/comparison';


export function cleanText(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/fi\s+/g, 'fi')
    .replace(/fl\s+/g, 'fl')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
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

  // Dashes / Empty indicators
  if (config.normalizeDashes) {
    if (s === '---' || s === '--' || s === '-' || s === '—' || s === '- - -') {
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
