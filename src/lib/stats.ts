export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = xs.toSorted((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function stdev(xs: number[]): number | null {
  const m = mean(xs);
  if (m == null || xs.length < 2) return null;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** A solve result in ms, or Infinity for a DNF. */
export type Result = number;

/** How many results are trimmed from each end of an average of n (WCA for 5, csTimer's 5% rule above that). */
export const trimCount = (n: number) => (n <= 5 ? 1 : Math.ceil(n * 0.05));

/**
 * Average of the last n results, newest last. Returns null if there aren't enough results,
 * Infinity for a DNF average (more DNFs than trimmed slots), else ms rounded to hundredths of a second.
 */
export function averageOf(results: Result[], n: number): number | null {
  if (results.length < n) return null;
  const window = results.slice(-n).toSorted((a, b) => a - b);
  const k = n === 3 ? 0 : trimCount(n);
  const kept = window.slice(k, n - k);
  if (kept.some((r) => !Number.isFinite(r))) return Infinity;
  return Math.round(kept.reduce((a, b) => a + b, 0) / kept.length / 10) * 10;
}

/** Best rolling average of n over the whole list. */
export function bestAverage(results: Result[], n: number): number | null {
  let best: number | null = null;
  for (let i = n; i <= results.length; i++) {
    const a = averageOf(results.slice(0, i), n);
    if (a != null && (best == null || a < best)) best = a;
  }
  return best;
}
