/**
 * Shared formatting utilities for real-estate data display.
 *
 * All functions are pure and null-safe — they return '—' on missing input
 * so callers never have to guard against undefined values in JSX.
 */

// ── Price ────────────────────────────────────────────────────────────────────

/**
 * formatPrice(3_174_155) → "от 3.2 млн"
 * formatPrice(574_500_000) → "от 574.5 млн"
 * formatPrice(850_000)  → "от 850 тыс."
 */
export function formatPrice(p: number | null | undefined): string {
  if (p == null || p === 0) return '—';

  // Защита от строк: принудительное преобразование в число
  const num = typeof p === 'string' ? parseFloat(p) : p;
  if (isNaN(num) || num === 0) return '—';

  if (num >= 1_000_000) {
    const mln = num / 1_000_000;
    // Show one decimal only when it's non-zero: 5.0 → "5", 5.6 → "5.6"
    const display = mln % 1 === 0 ? mln.toFixed(0) : mln.toFixed(1);
    return `от ${display} млн`;
  }

  const k = Math.round(num / 1_000);
  return `от ${k} тыс.`;
}

// ── Area ─────────────────────────────────────────────────────────────────────

/**
 * formatArea(34.94) → "34.9 м²"
 * formatArea(120)   → "120 м²"
 */
export function formatArea(a: number | null | undefined): string {
  if (a == null || a === 0) return '—';
  
  // Защита от строк: принудительное преобразование в число
  const num = typeof a === 'string' ? parseFloat(a) : a;
  if (isNaN(num) || num === 0) return '—';
  
  // Trim trailing zero after one decimal: 34.90 → "34.9", 120.0 → "120"
  const display = num % 1 === 0 ? num.toFixed(0) : parseFloat(num.toFixed(1)).toString();
  return `${display} м²`;
}

// ── Deadline ─────────────────────────────────────────────────────────────────

const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

/**
 * formatDeadline("2026-03-31") → "I кв. 2026"
 * formatDeadline("2027-09-01") → "III кв. 2027"
 */
export function formatDeadline(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const quarter = Math.ceil((d.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;
  return `${ROMAN[quarter]} кв. ${d.getFullYear()}`;
}
