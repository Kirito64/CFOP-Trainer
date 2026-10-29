import { expect, test } from "bun:test";
import type { Attempt, CaseProgress } from "../db/db";
import { addDays, aufMisses, blockMeans, caseCosts, dailyTime, mixUps, paceAdvice, recordHistory, rollingAverage, shareUnder, slowDays, streaks, trend, weekOf } from "./analytics";
import { localDay } from "./localDay";

const DNF = Infinity;
const recog = (caseKey: string, ok: boolean, picked?: string): Attempt =>
  ({ id: Math.random().toString(), caseKey, kind: "recog", ms: 900, ok, picked, at: 0, updatedAt: 0 }) as Attempt;

test("rolling average is null until there are enough solves", () => {
  expect(rollingAverage([10000, 11000, 12000, 13000, 14000, 9000], 5)).toEqual([null, null, null, null, 12000, 12000]);
});

test("share under counts DNFs as misses", () => {
  expect(shareUnder([9000, 10500, 11500, DNF], [10000, 11000, 12000])).toEqual([0.25, 0.5, 0.75]);
  expect(shareUnder([], [10000])).toEqual([null]);
});

test("record history lists each new best in order", () => {
  const solves = [12000, 11000, 11500, 10000, 10500].map((result, at) => ({ result, at }));
  expect(recordHistory(solves, 1)).toEqual([
    { value: 12000, at: 0 },
    { value: 11000, at: 1 },
    { value: 10000, at: 3 },
  ]);
  expect(recordHistory(solves, 3).map((r) => r.value)).toEqual([11500, 10830, 10670]);
});

test("block means drop a final block that is less than half full", () => {
  expect(blockMeans([[1, 10], [3, 20], [5, 30]], 2)).toEqual([[2, 15], [5, 30]]);
  expect(blockMeans([[1, 10], [3, 20], [5, 30], [7, 40], [9, 50]], 4)).toEqual([[4, 25]]);
});

test("case cost weighs the gap to target by how often the case comes up", () => {
  const attempts = [
    ...Array.from({ length: 5 }, () => ({ caseKey: "PLL:T", kind: "exec", ms: 2600, ok: true })),
    ...Array.from({ length: 5 }, () => ({ caseKey: "PLL:T", kind: "recog", ms: 1300, ok: true })),
  ] as Attempt[];
  const costs = caseCosts("PLL", attempts, new Map<string, CaseProgress>(), 1600);
  const t = costs.find((c) => c.key === "PLL:T")!;
  expect(t.exec).toBe(2600);
  expect(t.cost).toBeCloseTo((1 / 18) * (1000 + 500));
  // Untried cases cost nothing yet rather than guessing.
  expect(costs.find((c) => c.key === "PLL:Aa")!.cost).toBe(0);
});

test("trend compares the last 8 times with the 8 before", () => {
  expect(trend(Array(10).fill(1000))).toBeNull();
  expect(trend([...Array(8).fill(2000), ...Array(8).fill(1500)])).toBe("faster");
  expect(trend([...Array(8).fill(1500), ...Array(8).fill(1520)])).toBe("steady");
  expect(trend([...Array(8).fill(1500), ...Array(8).fill(1800)])).toBe("slower");
});

test("mix-ups count a pair whichever way round it was confused", () => {
  const attempts = [recog("PLL:Ga", false, "Gc"), recog("PLL:Gc", false, "Ga"), recog("PLL:Ja", false, "Jb"), recog("PLL:T", true), recog("PLL:Ga", false, "Ga")];
  const m = mixUps(attempts);
  expect(m).toHaveLength(2);
  expect(m[0]).toMatchObject({ n: 2 });
  expect([m[0].actual, m[0].picked].sort()).toEqual(["PLL:Ga", "PLL:Gc"]);
  expect(aufMisses(attempts).get("PLL:Ga")).toBe(1);
});

test("daily time counts short pauses and caps long breaks", () => {
  const day = localDay(new Date(2026, 9, 1, 12).getTime()).start;
  const t0 = day + 12 * 3_600_000;
  const t = dailyTime([
    { at: t0, kind: "solves", ms: 12_000 },
    { at: t0 + 60_000, kind: "solves", ms: 12_000 },
    { at: t0 + 120_000, kind: "trainer", ms: 2_000 },
    { at: t0 + 3_600_000, kind: "drills" },
  ]).get(day)!;
  expect(t).toEqual({ solves: 72_000, slow: 0, trainer: 60_000, recognition: 0, drills: 30_000 });
});

test("streaks count back from today, or from yesterday before today's practice", () => {
  const today = localDay(new Date(2026, 9, 10, 12).getTime()).start;
  const days = new Set([-6, -5, -2, -1].map((n) => addDays(today, n)));
  expect(streaks(days, today)).toEqual({ current: 2, longest: 2 });
  days.add(today);
  days.add(addDays(today, -3));
  days.add(addDays(today, -4));
  expect(streaks(days, today)).toEqual({ current: 7, longest: 7 });
});

test("weeks start on Monday", () => {
  const wed = localDay(new Date(2026, 9, 28).getTime()).start;
  expect(new Date(weekOf(wed)).getDay()).toBe(1);
  expect(new Date(weekOf(wed)).getDate()).toBe(26);
  const sun = localDay(new Date(2026, 10, 1).getTime()).start;
  expect(new Date(weekOf(sun)).getDate()).toBe(26);
});

test("slow days count smooth solves among the ones with pauses logged", () => {
  const at = new Date(2026, 9, 1, 18).getTime();
  const solve = (pauses: number | undefined, dayOffset = 0) => ({ id: "x", sessionId: "s", scramble: "", ms: 30_000, penalty: 0 as const, pauses, at: at + dayOffset * 86_400_000, updatedAt: 0 });
  const days = slowDays([solve(0), solve(2), solve(undefined), solve(0), solve(1, 1)]);
  expect(days.map((d) => [d.solves, d.logged, d.smooth, d.meanPauses])).toEqual([
    [4, 3, 2 / 3, 2 / 3],
    [1, 1, 0, 1],
  ]);
});

test("pace advice slows you down after a pause and speeds you up after three smooth solves", () => {
  expect(paceAdvice([undefined])).toBe(null);
  expect(paceAdvice([0, 0, 2])).toBe("slower");
  expect(paceAdvice([1, 0, 0])).toBe("hold");
  expect(paceAdvice([1, 0, undefined, 0, 0])).toBe("faster");
});
