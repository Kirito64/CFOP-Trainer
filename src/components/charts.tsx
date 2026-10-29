import { type KeyboardEvent, type PointerEvent, type ReactNode, useCallback, useRef, useState } from "react";

const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

/** The rendered width of an element, so charts draw in real pixels and their text stays readable at any size. */
function useWidth(): [(el: HTMLElement | null) => void, number] {
  const [width, setWidth] = useState(640);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    observer.current.observe(el);
  }, []);
  return [ref, width];
}

export interface Series {
  label: string;
  values: (number | null)[];
  /** A CSS colour, normally a theme variable. */
  color: string;
  /** Dots for raw points (singles), a line for anything smoothed. */
  kind?: "line" | "dots";
}

/** Two to four round tick values covering lo..hi. */
function ticks(lo: number, hi: number): number[] {
  const span = hi - lo || 1;
  const raw = span / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
  return out;
}

const seconds = (ms: number) => (ms / 1000).toFixed(ms % 1000 ? 1 : 0);

/**
 * Lines and dots over an index axis, with a crosshair and tooltip on hover or arrow keys, a legend for
 * more than one series, and the recent numbers as a table underneath.
 */
export function LineChart({
  series,
  xLabel,
  label,
  height = 200,
  format = seconds,
  tooltipFormat = format,
  reference,
  xTicks,
  table = 12,
  bands = false,
}: {
  series: Series[];
  /** What point i is, e.g. "Solve 140, 12 Oct". */
  xLabel: (i: number) => string;
  label: string;
  height?: number;
  format?: (v: number) => string;
  tooltipFormat?: (v: number) => string;
  /** A horizontal line for a target, labelled at the right. */
  reference?: { value: number; label: string };
  /** Indices to label along the bottom, with their text. */
  xTicks?: { i: number; label: string }[];
  /** How many of the latest points the table shows; 0 hides it. */
  table?: number;
  /** Place points in the middle of equal bands, to line up with a ColumnChart above or below. */
  bands?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth();
  const n = Math.max(...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null && Number.isFinite(v)));
  if (reference) all.push(reference.value);
  if (n < (bands ? 1 : 2) || !all.length) return null;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo || hi || 1) * 0.06;
  const [y0, y1] = [lo - pad, hi + pad];
  const plot = W - PAD.left - PAD.right;
  const x = (i: number) => PAD.left + (bands ? ((i + 0.5) / n) * plot : (i / (n - 1)) * plot);
  const y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0)) * (height - PAD.top - PAD.bottom);
  const finite = (v: number | null): v is number => v != null && Number.isFinite(v);

  const toIndex = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const f = (px - PAD.left) / plot;
    return Math.max(0, Math.min(n - 1, bands ? Math.floor(f * n) : Math.round(f * (n - 1))));
  };
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n - 1) - step));
    else if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? n - 1) + step));
    else return;
    e.preventDefault();
  };

  const lines = (values: (number | null)[]) => {
    const out: string[][] = [[]];
    values.forEach((v, i) => (finite(v) ? out.at(-1)!.push(`${x(i)},${y(v)}`) : out.at(-1)!.length && out.push([])));
    return out.filter((p) => p.length > 1).map((p) => p.join(" "));
  };

  const rows = Array.from({ length: n }, (_, i) => i)
    .filter((i) => series.some((s) => finite(s.values[i] ?? null)))
    .slice(-table)
    .reverse();

  return (
    <figure ref={ref} className="min-w-0">
      {series.length > 1 && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-hidden>
          {series.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5">
              {s.kind === "dots" ? (
                <span className="size-2 rounded-full opacity-60" style={{ background: s.color }} />
              ) : (
                <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              )}
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="w-full touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-steel"
          role="img"
          aria-label={label}
          tabIndex={0}
          onPointerMove={(e) => setHover(toIndex(e))}
          onPointerDown={(e) => setHover(toIndex(e))}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover((h) => h ?? n - 1)}
          onBlur={() => setHover(null)}
          onKeyDown={onKey}
        >
          {ticks(y0, y1).map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--rule)" />
              <text x={PAD.left - 8} y={y(v) + 4} fontSize={11} textAnchor="end" fill="var(--ink-3)">
                {format(v)}
              </text>
            </g>
          ))}
          {xTicks?.map((t) => (
            <text key={t.i} x={x(t.i)} y={height - 6} fontSize={11} textAnchor={edgeAnchor(x(t.i), W)} fill="var(--ink-3)">
              {t.label}
            </text>
          ))}
          {reference && (
            <line x1={PAD.left} x2={W - PAD.right} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--ready)" strokeWidth={1.5} />
          )}
          {series.map((s) =>
            s.kind === "dots" ? (
              <g key={s.label} fill={s.color} opacity={0.45}>
                {s.values.map((v, i) => finite(v) && <circle key={i} cx={x(i)} cy={y(v)} r={2.5} />)}
              </g>
            ) : (
              lines(s.values).map((pts, k) => (
                <polyline key={`${s.label}${k}`} points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ))
            ),
          )}
          {reference && (
            <text x={W - PAD.right} y={y(reference.value) - 6} fontSize={11} textAnchor="end" fill="var(--ink-2)" stroke="var(--mat)" strokeWidth={4} paintOrder="stroke">
              {reference.label}
            </text>
          )}
          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={height - PAD.bottom} stroke="var(--ink-3)" />
              {series.map((s) => {
                const v = s.values[hover];
                return finite(v ?? null) && <circle key={s.label} cx={x(hover)} cy={y(v!)} r={4} fill={s.color} stroke="var(--panel)" strokeWidth={2} />;
              })}
            </g>
          )}
        </svg>
        {hover != null && (
          <Tooltip left={x(hover) / W}>
            <p className="font-semibold">{xLabel(hover)}</p>
            {series.map((s) => (
              <p key={s.label} className="flex items-center gap-1.5 text-ink-2">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.label} <span className="ml-auto pl-3 text-ink tabular-nums">{show(s.values[hover], tooltipFormat)}</span>
              </p>
            ))}
          </Tooltip>
        )}
      </div>
      {table > 0 && (
        <details className="mt-1 text-sm">
          <summary className="text-ink-3 hover:text-ink">Show the numbers</summary>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full tabular-nums">
              <thead>
                <tr className="text-left text-ink-3">
                  <th className="font-normal" />
                  {series.map((s) => (
                    <th key={s.label} className="text-right font-normal">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rows.map((i) => (
                  <tr key={i}>
                    <td className="py-1 text-ink-2">{xLabel(i)}</td>
                    {series.map((s) => (
                      <td key={s.label} className="text-right">
                        {show(s.values[i], tooltipFormat)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}

/** Keep edge labels inside the chart. */
const edgeAnchor = (x: number, w: number) => (x < 40 + PAD.left ? "start" : x > w - 40 ? "end" : "middle");

const show = (v: number | null | undefined, format: (v: number) => string) => (v == null ? "–" : Number.isFinite(v) ? format(v) : "DNF");

function Tooltip({ left, children }: { left: number; children: ReactNode }) {
  // Flip to the other side of the crosshair past the middle so it never runs off the chart.
  const style = left > 0.5 ? { right: `${(1 - left) * 100 + 1.5}%` } : { left: `${left * 100 + 1.5}%` };
  return (
    <div className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-lg border border-rule bg-panel px-3 py-2 text-sm shadow-lg" style={style}>
      {children}
    </div>
  );
}

/** One series of columns, e.g. minutes per week. */
export function ColumnChart({
  values,
  labels,
  label,
  format,
  tooltipFormat = format,
  height = 140,
  tick = (i) => labels[i],
}: {
  values: number[];
  labels: string[];
  label: string;
  /** For the axis; keep it short. */
  format: (v: number) => string;
  tooltipFormat?: (v: number) => string;
  height?: number;
  tick?: (i: number) => string | null;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth();
  const hi = Math.max(...values, 1);
  const band = (W - PAD.left - PAD.right) / values.length;
  const bar = Math.min(24, band - 2);
  const top = (v: number) => PAD.top + (1 - v / hi) * (height - PAD.top - PAD.bottom);
  const base = height - PAD.bottom;
  return (
    <figure ref={ref} className="relative min-w-0">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
        {ticks(0, hi).map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={top(v)} y2={top(v)} stroke="var(--rule)" />
            <text x={PAD.left - 8} y={top(v) + 4} fontSize={11} textAnchor="end" fill="var(--ink-3)">
              {format(v)}
            </text>
          </g>
        ))}
        {values.map((v, i) => {
          const cx = PAD.left + band * (i + 0.5);
          const h = base - top(v);
          const r = Math.min(4, h);
          const t = tick(i);
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={cx - band / 2} y={PAD.top} width={band} height={base - PAD.top} fill="transparent" />
              {v > 0 && (
                <path
                  d={`M${cx - bar / 2},${base} v${-(h - r)} q0,${-r} ${r},${-r} h${bar - 2 * r} q${r},0 ${r},${r} v${h - r} z`}
                  fill="var(--steel)"
                  opacity={hover == null || hover === i ? 1 : 0.55}
                />
              )}
              {t && (
                <text x={cx} y={height - 6} fontSize={11} textAnchor={edgeAnchor(cx, W)} fill="var(--ink-3)">
                  {t}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <Tooltip left={(PAD.left + band * (hover + 0.5)) / W}>
          <p className="font-semibold">{labels[hover]}</p>
          <p className="text-ink-2">{tooltipFormat(values[hover])}</p>
        </Tooltip>
      )}
    </figure>
  );
}

const HEAT = [0.28, 0.5, 0.75, 1];

/** A GitHub-style calendar of the last `weeks` weeks, one cell per day, shaded by `value`. */
export function CalendarHeatmap({
  days,
  weeks,
  today,
  bins,
  format,
  label,
}: {
  /** Local day start → value. */
  days: Map<number, number>;
  weeks: number;
  today: number;
  /** Upper bounds of the first three shades; anything above the last is the darkest. */
  bins: [number, number, number];
  format: (day: number, v: number) => string;
  label: string;
}) {
  const [hover, setHover] = useState<{ day: number; col: number } | null>(null);
  const cell = 14;
  const gap = 3;
  const left = 28;
  const topPad = 16;
  // Columns are weeks starting Monday; the last column holds today.
  const dow = (new Date(today).getDay() + 6) % 7;
  const start = shift(today, -(weeks - 1) * 7 - dow);
  const cols = Array.from({ length: weeks }, (_, c) => Array.from({ length: 7 }, (_, r) => shift(start, c * 7 + r)));
  const shade = (v: number) => (v <= 0 ? null : HEAT[bins.findIndex((b) => v <= b) === -1 ? 3 : bins.findIndex((b) => v <= b)]);
  const w = left + weeks * (cell + gap);
  const h = topPad + 7 * (cell + gap);
  const monthStarts = cols.map((col, c) => ({ c, d: new Date(col[0]) })).filter(({ d, c }) => c === 0 || d.getDate() <= 7);
  return (
    <figure className="relative min-w-0">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-3xl" role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
        {monthStarts.map(({ c, d }) => (
          <text key={c} x={left + c * (cell + gap)} y={11} fontSize={10} fill="var(--ink-3)">
            {d.toLocaleDateString(undefined, { month: "short" })}
          </text>
        ))}
        {["Mon", "Wed", "Fri"].map((d, i) => (
          <text key={d} x={0} y={topPad + (i * 2 + 1) * (cell + gap) - gap - 2} fontSize={10} fill="var(--ink-3)">
            {d}
          </text>
        ))}
        {cols.map((col, c) =>
          col.map((day, r) => {
            if (day > today) return null;
            const v = days.get(day) ?? 0;
            const o = shade(v);
            return (
              <rect
                key={day}
                x={left + c * (cell + gap)}
                y={topPad + r * (cell + gap)}
                width={cell}
                height={cell}
                rx={3}
                fill={o == null ? "var(--panel-2)" : "var(--steel)"}
                fillOpacity={o ?? 1}
                stroke={hover?.day === day ? "var(--ink)" : "none"}
                onPointerEnter={() => setHover({ day, col: c })}
                onPointerDown={() => setHover({ day, col: c })}
              />
            );
          }),
        )}
      </svg>
      {hover && (
        <Tooltip left={(left + hover.col * (cell + gap)) / w}>
          <p className="font-semibold">{new Date(hover.day).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</p>
          <p className="text-ink-2">{format(hover.day, days.get(hover.day) ?? 0)}</p>
        </Tooltip>
      )}
      <figcaption className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
        Less
        <span className="size-3 rounded-[3px] bg-panel-2" />
        {HEAT.map((o) => (
          <span key={o} className="size-3 rounded-[3px] bg-steel" style={{ opacity: o }} />
        ))}
        More
      </figcaption>
    </figure>
  );
}

function shift(day: number, n: number) {
  const d = new Date(day);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Horizontal bars for a handful of labelled amounts, value at the tip. */
export function BarList({ items, format }: { items: { label: ReactNode; value: number; key: string }[]; format: (v: number) => string }) {
  const hi = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 text-sm">
          <span className="text-ink-2">{i.label}</span>
          <span className="flex items-center gap-2">
            {i.value > 0 && <span className="h-3 rounded-r bg-steel" style={{ width: `${(i.value / hi) * 65}%` }} />}
            <span className="whitespace-nowrap tabular-nums">{format(i.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
