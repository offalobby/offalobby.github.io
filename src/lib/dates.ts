/**
 * Dates in frontmatter are written the way a resume writes them:
 * "2026", "2026-05", "Fall 2026" or "present".
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TERM_MONTH: Record<string, number> = { Spring: 1, Summer: 5, Fall: 8 };

interface Parsed {
  /** months since year 0, for sorting */
  key: number;
  year?: number;
  month?: number;
  term?: string;
  present?: boolean;
}

export function parseWhen(value: string | undefined): Parsed | null {
  if (!value) return null;
  if (value === 'present') return { key: Number.MAX_SAFE_INTEGER, present: true };
  const term = value.match(/^(Spring|Summer|Fall) (\d{4})$/);
  if (term) {
    const year = Number(term[2]);
    return { key: year * 12 + TERM_MONTH[term[1]], year, term: term[1] };
  }
  const [y, m] = value.split('-').map(Number);
  return { key: y * 12 + (m ?? 1), year: y, month: m };
}

function label(p: Parsed, withYear = true): string {
  if (p.present) return 'Present';
  if (p.term) return withYear ? `${p.term} ${p.year}` : p.term;
  if (p.month) return withYear ? `${MONTHS[p.month - 1]} ${p.year}` : MONTHS[p.month - 1];
  return String(p.year);
}

/** "May – Sep 2026", "Dec 2024 – Dec 2025", "Fall 2026 – Present", "Jan 2026" */
export function formatRange(start: string, end?: string): string {
  const a = parseWhen(start)!;
  const b = parseWhen(end);
  if (!b) return label(a);
  if (b.present) return `${label(a)} – Present`;
  const sameYear = a.year === b.year && !a.term && !b.term && a.month && b.month;
  return sameYear ? `${label(a, false)} – ${label(b)}` : `${label(a)} – ${label(b)}`;
}

/** Sort key: most recent first, ongoing work ahead of finished work. */
export function recency(start: string, end?: string): number {
  return (parseWhen(end)?.key ?? parseWhen(start)!.key) * 1e3 + parseWhen(start)!.key / 1e4;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
