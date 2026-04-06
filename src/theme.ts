import type { CompositeLevel, ClaimResult } from './types/envelope';

export interface ColorScheme {
  bg: string;
  border: string;
  text: string;
}

export interface ResultStyle {
  bg: string;
  text: string;
  icon: string;
}

export const TRUST_COLORS: Record<CompositeLevel, ColorScheme> = {
  VERIFIED: { bg: '#0a2e1a', border: '#10b981', text: '#34d399' },
  HIGH:     { bg: '#0a2418', border: '#22c55e', text: '#4ade80' },
  MEDIUM:   { bg: '#1a1a08', border: '#eab308', text: '#facc15' },
  LOW:      { bg: '#1a1208', border: '#f97316', text: '#fb923c' },
  CRITICAL: { bg: '#1a0a0a', border: '#ef4444', text: '#f87171' },
};

export const RESULT_INFO: Record<ClaimResult, ResultStyle> = {
  SATISFIED:      { bg: '#052e16', text: '#4ade80', icon: '\u2713' },
  PARTIAL:        { bg: '#1c1917', text: '#fbbf24', icon: '\u25d0' },
  NOT_SATISFIED:  { bg: '#1c0a0a', text: '#f87171', icon: '\u2717' },
  INDETERMINATE:  { bg: '#18181b', text: '#a1a1aa', icon: '?' },
  NOT_APPLICABLE: { bg: '#18181b', text: '#71717a', icon: '\u2014' },
};

export function getLevelColor(level: string): ColorScheme {
  return TRUST_COLORS[level as CompositeLevel] || TRUST_COLORS.CRITICAL;
}

export function getResultStyle(result: string): ResultStyle {
  return RESULT_INFO[result as ClaimResult] || RESULT_INFO.INDETERMINATE;
}
