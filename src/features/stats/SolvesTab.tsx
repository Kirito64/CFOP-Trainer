import { useMemo, useState } from "react";
import { Link } from "react-router";
import { LineChart } from "../../components/charts";
import { Empty, fmt, Section, Tabs } from "../../components/ui";
import type { Solve } from "../../db/db";
import { PHASE_NAMES, phaseDurations, resultOf } from "../../db/solves";
import { blockMeans, recordHistory, rollingAverage, shareUnder } from "../../lib/analytics";
import { averageOf, bestAverage, mean, stdev } from "../../lib/stats";
import { Metric, shortDate } from "./common";

/** Rough stage targets for a sub-10 average (ms), from the research notes. */
const SUB10_SPLITS = [1300, 5300, 1600, 1600];
const SPLIT_BLOCK = 10;

type Range = 100 | 1000 | "all";

export function SolvesTab({ solves, goalMs }: { solves: Solve[]; goalMs: number }) {
  const [range, setRange] = useState<Range>(1000);
  const results = useMemo(() => solves.map(resultOf), [solves]);
  const ao12 = useMemo(() => rollingAverage(results, 12), [results]);
  const ao100 = useMemo(() => rollingAverage(results, 100), [results]);

  if (!solves.length)
    return (
      <Empty>
        No timed solves yet. <Link to="/timer" className="underline">Open the timer</Link> and do an ao12 to get a baseline.
      </Empty>
    );

  const last100 = results.slice(-100);
  const finite100 = last100.filter(Number.isFinite);
  const spread = stdev(finite100);
  const [underGoal] = shareUnder(last100, [goalMs]);
  const from = range === "all" ? 0 : Math.max(0, solves.length - range);
  const shown = (xs: (number | null)[]) => xs.slice(from);
  const n = solves.length - from;
  const solveLabel = (i: number) => `Solve ${from + i + 1}, ${shortDate(solves[from + i].at)}`;
  const tickAt = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <>
      <div className="metric-grid">
        <Metric label="Current ao12" value={fmt(averageOf(results, 12), averageOf(results, 12) === Infinity)}>
          Best {fmt(bestAverage(results, 12))}
        </Metric>
        <Metric label="Current ao100" value={fmt(averageOf(results, 100), averageOf(results, 100) === Infinity)}>
          {results.length < 100 ? `${100 - results.length} more solves to get one` : `Best ${fmt(bestAverage(results, 100))}`}
        </Metric>
        <Metric label={`Under your ${fmt(goalMs)} goal`} value={underGoal == null ? "–" : `${Math.round(underGoal * 100)}%`} accent>
          Of your last {last100.length} solves
        </Metric>
        <Metric label="Spread" value={spread == null ? "–" : `±${fmt(spread)}`}>
          How far a typical solve lands from your mean of {fmt(mean(finite100))}. Lower is more consistent.
        </Metric>
      </div>

      <Section
        title="Your times"
        aside={
          <Tabs<Range>
            label="Solves shown"
            value={range}
            onChange={setRange}
            options={[
              { value: 100, label: "Last 100" },
              { value: 1000, label: "Last 1000" },
              { value: "all", label: "All" },
            ]}
          />
        }
      >
        <LineChart
          label="Single times with rolling ao12 and ao100"
          height={240}
          series={[
            { label: "Singles", values: shown(results), color: "var(--ink-3)", kind: "dots" },
            { label: "ao12", values: shown(ao12), color: "var(--ink-2)" },
            ...(ao100.some((v) => v != null) ? [{ label: "ao100", values: shown(ao100), color: "var(--steel)" }] : []),
          ]}
          xLabel={solveLabel}
          xTicks={tickAt.map((i) => ({ i, label: shortDate(solves[from + i].at) }))}
          reference={{ value: goalMs, label: `Goal ${fmt(goalMs)}` }}
          tooltipFormat={fmt}
        />
      </Section>

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Section title="How often you beat each time">
          <ShareTable results={results} goalMs={goalMs} />
        </Section>
        <Section title="Personal bests">
          <BestsTable solves={solves} results={results} />
        </Section>
      </div>

      <Splits solves={solves} />
    </>
  );
}

function ShareTable({ results, goalMs }: { results: number[]; goalMs: number }) {
  const thresholds = [0, 1000, 2000, 3000].map((d) => goalMs + d);
  const cols = [
    { label: "Last 100", rs: results.slice(-100) },
    { label: "100 before", rs: results.length > 100 ? results.slice(-200, -100) : [] },
    { label: "All time", rs: results },
  ];
  const shares = cols.map((c) => shareUnder(c.rs, thresholds));
  return (
    <table className="w-full tabular-nums">
      <thead>
        <tr className="text-sm text-ink-3">
          <th />
          {cols.map((c) => (
            <th key={c.label} className="text-right font-normal">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-rule">
        {thresholds.map((t, i) => (
          <tr key={t}>
            <th className="py-1.5 text-left font-normal text-ink-2">Under {fmt(t)}</th>
            {shares.map((s, c) => (
              <td key={c} className="text-right font-display text-lg">
                {s[i] == null ? "–" : `${Math.round(s[i]! * 100)}%`}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BestsTable({ solves, results }: { solves: Solve[]; results: number[] }) {
  const monthAgo = Date.now() - 30 * 86_400_000;
  const timed = solves.map((s, i) => ({ at: s.at, result: results[i] }));
  const rows = [1, 5, 12, 100].map((n) => ({ n, history: recordHistory(timed, n) })).filter((r) => r.history.length);
  return (
    <table className="w-full tabular-nums">
      <thead>
        <tr className="text-sm text-ink-3">
          <th />
          <th className="text-right font-normal">Best</th>
          <th className="text-right font-normal">Set on</th>
          <th className="text-right font-normal">Before that</th>
          <th className="text-right font-normal">New bests, 30 days</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-rule">
        {rows.map(({ n, history }) => (
          <tr key={n}>
            <th className="py-1.5 text-left font-normal text-ink-2">{n === 1 ? "Single" : `ao${n}`}</th>
            <td className="text-right font-display text-lg">{fmt(history.at(-1)!.value)}</td>
            <td className="text-right text-sm text-ink-2">{shortDate(history.at(-1)!.at)}</td>
            <td className="text-right text-ink-2">{fmt(history.at(-2)?.value)}</td>
            <td className="text-right">{history.filter((h) => h.at >= monthAgo).length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Splits({ solves }: { solves: Solve[] }) {
  const all = solves.map((s) => ({ s, p: phaseDurations(s) })).filter((x): x is { s: Solve; p: number[] } => !!x.p);
  if (!all.length)
    return (
      <Section title="Where the time goes">
        <p className="max-w-[65ch] text-ink-2">
          Turn on Split taps in the timer (tap any key after the cross, F2L and OLL) to see which stage costs you the most time and how each one changes.
        </p>
      </Section>
    );
  const recent = all.slice(-50).map((x) => x.p);
  const blocks = blockMeans(
    all.map((x) => x.p),
    SPLIT_BLOCK,
  );
  const blockLabel = (b: number) => {
    const first = all[b * SPLIT_BLOCK];
    const last = all[Math.min(all.length, (b + 1) * SPLIT_BLOCK) - 1];
    return `Solves ${b * SPLIT_BLOCK + 1}–${Math.min(all.length, (b + 1) * SPLIT_BLOCK)}, ${shortDate(first.s.at)}${first.s.at !== last.s.at ? ` to ${shortDate(last.s.at)}` : ""}`;
  };
  return (
    <Section title="Where the time goes" aside={<span className="text-sm text-ink-3">{all.length} solves with splits</span>}>
      <p className="mb-3 max-w-[65ch] text-sm text-ink-2">
        Mean of your last {recent.length} solves with split taps, next to rough sub-10 targets. The biggest gap is usually the best place to practise.
      </p>
      <table className="mb-8 w-full max-w-lg tabular-nums">
        <thead>
          <tr className="text-sm text-ink-3">
            <th />
            <th className="text-right font-normal">You</th>
            <th className="text-right font-normal">Sub-10</th>
            <th className="text-right font-normal">Gap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {PHASE_NAMES.map((name, i) => {
            const you = mean(recent.map((p) => p[i]))!;
            return (
              <tr key={name}>
                <th className="py-1.5 text-left font-normal text-ink-2">{name}</th>
                <td className="text-right font-display text-xl">{fmt(you)}</td>
                <td className="text-right font-display text-xl text-ink-3">{fmt(SUB10_SPLITS[i])}</td>
                <td className={`text-right font-display text-xl ${you - SUB10_SPLITS[i] > 800 ? "text-warn" : ""}`}>
                  {you > SUB10_SPLITS[i] ? `+${fmt(you - SUB10_SPLITS[i])}` : "on target"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {blocks.length > 1 ? (
        <>
          <h3 className="mb-1 font-display text-base font-bold">Each stage over time</h3>
          <p className="mb-4 text-sm text-ink-2">Mean of every {SPLIT_BLOCK} solves with splits. The green line is the sub-10 target.</p>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {PHASE_NAMES.map((name, i) => (
              <div key={name}>
                <h4 className="text-sm font-semibold">{name}</h4>
                <LineChart
                  label={`${name} time over time`}
                  height={150}
                  series={[{ label: name, values: blocks.map((b) => b[i]), color: "var(--steel)" }]}
                  xLabel={blockLabel}
                  reference={{ value: SUB10_SPLITS[i], label: "Sub-10" }}
                  format={(v) => (v / 1000).toFixed(1)}
                  tooltipFormat={fmt}
                  table={0}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-3">Do {SPLIT_BLOCK + SPLIT_BLOCK / 2 - all.length} more solves with splits to see how each stage changes over time.</p>
      )}
    </Section>
  );
}
