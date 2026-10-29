import { useMemo } from "react";
import { Link } from "react-router";
import { BarList, CalendarHeatmap, ColumnChart, LineChart } from "../../components/charts";
import { Empty, fmt, Section } from "../../components/ui";
import type { Attempt, DrillResult, Solve } from "../../db/db";
import { resultOf } from "../../db/solves";
import { ACTIVITY_LABEL, type ActivityKind, activities, addDays, dailyTime, slowDays, streaks, total, weekOf } from "../../lib/analytics";
import { localDay } from "../../lib/localDay";
import { mean } from "../../lib/stats";
import { duration, Metric, shortDate } from "./common";

const WEEKS = 12;

export function PracticeTab({ solves, slow, attempts, drills }: { solves: Solve[]; slow: Solve[]; attempts: Attempt[]; drills: DrillResult[] }) {
  const today = localDay().start;
  const daily = useMemo(() => dailyTime(activities({ solves, slow, attempts, drills })), [solves, slow, attempts, drills]);
  if (!daily.size)
    return (
      <Empty>
        Nothing practised yet. Start with <Link to="/" className="underline">today's plan</Link> and your practice calendar fills in here.
      </Empty>
    );

  const days = new Set([...daily].filter(([, t]) => total(t) > 0).map(([d]) => d));
  const { current, longest } = streaks(days, today);
  const sumSince = (from: number, to = Infinity) => [...daily].filter(([d]) => d >= from && d < to).reduce((a, [, t]) => a + total(t), 0);
  const week = sumSince(addDays(today, -6));
  const weekBefore = sumSince(addDays(today, -13), addDays(today, -6));
  const last30 = [...days].filter((d) => d > addDays(today, -30)).length;

  const byKind = { solves: 0, slow: 0, trainer: 0, recognition: 0, drills: 0 };
  for (const [d, t] of daily) if (d > addDays(today, -30)) for (const k of Object.keys(byKind) as ActivityKind[]) byKind[k] += t[k];

  // Week by week, oldest first, ending with this week.
  const weekStarts = Array.from({ length: WEEKS }, (_, i) => addDays(weekOf(today), -7 * (WEEKS - 1 - i)));
  const weekIndex = (at: number) => weekStarts.indexOf(weekOf(localDay(at).start));
  const weekMinutes = weekStarts.map(() => 0);
  for (const [d, t] of daily) {
    const i = weekIndex(d);
    if (i >= 0) weekMinutes[i] += total(t);
  }
  const weekTimes: number[][] = weekStarts.map(() => []);
  for (const s of solves) {
    const i = weekIndex(s.at);
    const r = resultOf(s);
    if (i >= 0 && Number.isFinite(r)) weekTimes[i].push(r);
  }
  const weekLabel = (i: number) => `Week of ${shortDate(weekStarts[i])}`;
  const weekTick = (i: number) => (i % 3 === WEEKS % 3 || i === WEEKS - 1 ? shortDate(weekStarts[i]) : null);

  return (
    <>
      <div className="metric-grid">
        <Metric label="Streak" value={<>{current}<span>{current === 1 ? "day" : "days"}</span></>} accent>
          Longest {longest} {longest === 1 ? "day" : "days"}
        </Metric>
        <Metric label="Days practised" value={<>{last30}<span>of 30</span></>}>
          In the last 30 days
        </Metric>
        <Metric label="Last 7 days" value={duration(week)}>
          {weekBefore ? `${duration(weekBefore)} the week before` : "Nothing the week before"}
        </Metric>
        <Metric label="Last 30 days" value={duration(sumSince(addDays(today, -29)))}>
          Across every activity
        </Metric>
      </div>

      <Section title="Practice calendar">
        <CalendarHeatmap
          label="Minutes practised per day over the last 26 weeks"
          days={new Map([...daily].map(([d, t]) => [d, total(t) / 60_000]))}
          weeks={26}
          today={today}
          bins={[10, 30, 60]}
          format={(_, v) => (v ? `About ${duration(v * 60_000)} practised` : "No practice")}
        />
        <p className="mt-3 max-w-[70ch] text-sm text-ink-3">
          Time is worked out from when you did things: pauses under five minutes count, longer breaks don't. Short daily sessions beat one long one a week.
        </p>
      </Section>

      <div className="grid gap-x-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Section title="Where your time went, last 30 days">
          <BarList
            items={(Object.keys(byKind) as ActivityKind[])
              .filter((k) => k !== "slow" || slow.length)
              .map((k) => ({ key: k, label: ACTIVITY_LABEL[k], value: byKind[k] }))}
            format={duration}
          />
        </Section>
        <Section title="Practice and speed, week by week">
          <h3 className="text-sm font-semibold">Minutes practised</h3>
          <ColumnChart
            label="Minutes practised per week"
            values={weekMinutes.map((m) => m / 60_000)}
            labels={weekStarts.map((_, i) => weekLabel(i))}
            format={(v) => `${Math.round(v)}`}
            tooltipFormat={(v) => duration(v * 60_000)}
            tick={weekTick}
          />
          <h3 className="mt-4 text-sm font-semibold">Mean solve time</h3>
          {weekTimes.some((t) => t.length) ? (
            <LineChart
              label="Mean solve time per week"
              height={150}
              bands
              series={[{ label: "Mean", values: weekTimes.map((t) => mean(t)), color: "var(--steel)" }]}
              xLabel={(i) => `${weekLabel(i)}, ${weekTimes[i].length} solves`}
              xTicks={weekStarts.map((_, i) => ({ i, label: weekTick(i) ?? "" })).filter((t) => t.label)}
              tooltipFormat={fmt}
              table={0}
            />
          ) : (
            <p className="text-sm text-ink-3">No timed solves in these weeks.</p>
          )}
        </Section>
      </div>

      {slow.length > 0 && <SlowSolves slow={slow} />}

      <Drills drills={drills} />
    </>
  );
}

function SlowSolves({ slow }: { slow: Solve[] }) {
  const days = slowDays(slow).filter((d) => d.smooth != null);
  return (
    <Section title="Slow solves">
      <p className="mb-3 max-w-[65ch] text-sm text-ink-2">
        Share of your slow solves each day with no pauses. When most are smooth, speed up a little; the aim is to keep turning while you look ahead.
      </p>
      {days.length > 1 ? (
        <LineChart
          label="Share of slow solves with no pauses, by day"
          height={160}
          series={[{ label: "Smooth", values: days.map((d) => d.smooth! * 100), color: "var(--steel)" }]}
          xLabel={(i) => `${shortDate(days[i].day)}, ${days[i].logged} ${days[i].logged === 1 ? "solve" : "solves"} logged, ${days[i].meanPauses!.toFixed(1)} pauses each`}
          format={(v) => `${Math.round(v)}%`}
          table={0}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-rule px-4 py-5 text-sm text-ink-2">
          {days.length ? "One day logged so far. Come back after another slow session." : "Log your pauses after each slow solve in the timer to see this."}
        </p>
      )}
    </Section>
  );
}

/** Per drill: what to plot for each day, and which way is better. */
const DRILLS: {
  id: string;
  name: string;
  to: string;
  per: (rs: DrillResult[]) => number;
  format: (v: number) => string;
  axis: (v: number) => string;
  better: string;
}[] = [
  {
    id: "cross",
    name: "Cross trainer",
    to: "/drills/cross",
    per: (rs) => (100 * rs.filter((r) => r.score > 0).length) / rs.length,
    format: (v) => `${Math.round(v)}%`,
    axis: (v) => `${Math.round(v)}%`,
    better: "Share of crosses solved from your plan. Higher is better.",
  },
  {
    id: "metronome",
    name: "Metronome solves",
    to: "/drills/metronome",
    per: (rs) => Math.max(...rs.map((r) => r.score)),
    format: (v) => `${Math.round(v)} bpm`,
    axis: (v) => `${Math.round(v)}`,
    better: "Fastest tempo you held that day. Higher is better.",
  },
  {
    id: "tps",
    name: "Alg sprints",
    to: "/drills/tps",
    per: (rs) => Math.max(...rs.map((r) => r.score)),
    format: (v) => `${v.toFixed(2)} tps`,
    axis: (v) => v.toFixed(1),
    better: "Best turns per second that day. Higher is better.",
  },
  {
    id: "pll-attack",
    name: "PLL time attack",
    to: "/drills/pll-attack",
    per: (rs) => Math.min(...rs.map((r) => r.score)),
    format: (v) => fmt(v),
    axis: (v) => (v / 1000).toFixed(0),
    better: "Best time that day. Lower is better.",
  },
];

function Drills({ drills }: { drills: DrillResult[] }) {
  const charts = DRILLS.map((d) => {
    const byDay = new Map<number, DrillResult[]>();
    for (const r of drills.filter((r) => r.drill === d.id)) {
      const day = localDay(r.at).start;
      byDay.set(day, [...(byDay.get(day) ?? []), r]);
    }
    const points = [...byDay].sort((a, b) => a[0] - b[0]).map(([day, rs]) => ({ day, v: d.per(rs), n: rs.length }));
    return { ...d, points };
  });
  return (
    <Section title="Drills over time">
      <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
        {charts.map((c) => (
          <div key={c.id}>
            <h3 className="flex items-baseline justify-between gap-2 text-sm font-semibold">
              {c.name}
              {c.points.length > 0 && <span className="font-normal text-ink-2">Latest {c.format(c.points.at(-1)!.v)}</span>}
            </h3>
            <p className="mb-2 text-sm text-ink-3">{c.better}</p>
            {c.points.length > 1 ? (
              <LineChart
                label={`${c.name} by day`}
                height={140}
                series={[{ label: c.name, values: c.points.map((p) => p.v), color: "var(--steel)" }]}
                xLabel={(i) => `${shortDate(c.points[i].day)}, ${c.points[i].n} ${c.points[i].n === 1 ? "try" : "tries"}`}
                format={c.axis}
                tooltipFormat={c.format}
                table={0}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-rule px-4 py-5 text-sm text-ink-2">
                {c.points.length ? "One day so far. Come back after another session." : "Not tried yet."}{" "}
                <Link to={c.to} className="underline">
                  Open {c.name.toLowerCase()}
                </Link>
              </p>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
