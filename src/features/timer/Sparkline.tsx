import { averageOf } from "../../lib/stats";

/** Single times as dots with a rolling average line, newest on the right. */
export function Sparkline({ values, window }: { values: number[]; window: number }) {
  const w = 320;
  const h = 90;
  const shown = values.slice(-100);
  const finite = shown.filter(Number.isFinite);
  if (finite.length < 2) return null;
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const y = (v: number) => h - 6 - ((v - lo) / (hi - lo || 1)) * (h - 12);
  const x = (i: number) => (i / Math.max(1, shown.length - 1)) * (w - 8) + 4;
  const avg = shown.map((_, i) => averageOf(shown.slice(0, i + 1), window));
  const line = avg
    .map((a, i) => (a != null && Number.isFinite(a) ? `${x(i)},${y(a)}` : null))
    .filter(Boolean)
    .join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Times with rolling average of ${window}`}>
        {shown.map((v, i) => Number.isFinite(v) && <circle key={i} cx={x(i)} cy={y(v)} r={1.8} fill="var(--ink-3)" />)}
        <polyline points={line} fill="none" stroke="var(--steel)" strokeWidth={2} strokeLinejoin="round" />
      </svg>
      <figcaption className="text-sm text-ink-3">
        Dots are singles, the line is your rolling ao{window}. Lower is faster.
      </figcaption>
    </figure>
  );
}
