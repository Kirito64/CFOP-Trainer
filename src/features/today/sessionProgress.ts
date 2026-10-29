import type { Attempt, DrillResult, Solve } from "../../db/db";
import type { LocalDay } from "../../lib/localDay";

export const STATS_VISIT_KEY = "session-plan:stats-visited-at";
export type FocusKey = "Cross" | "F2L" | "OLL" | "PLL";

export const SESSION_TARGETS = { warmup: 25, review: 20, cross: 15, metronome: 3, oll: 25, pllAttack: 1, solves: 24 } as const;

interface Activity { at: number; deleted?: boolean }
type PracticeAttempt = Pick<Attempt, "kind" | "caseKey" | "at" | "deleted">;
type PracticeDrill = Pick<DrillResult, "drill" | "at" | "deleted">;

export interface StepProgress {
  count: number;
  target: number;
  done: boolean;
  label: string;
}

function counter(count: number, target: number, unit: string): StepProgress {
  return { count, target, done: count >= target, label: `${count} / ${target} ${unit}` };
}

export function sessionProgress({ day, attempts, drills, solves, reviewCount, statsVisitedAt, focus }: {
  day: LocalDay;
  attempts: readonly PracticeAttempt[];
  drills: readonly PracticeDrill[];
  solves: readonly Pick<Solve, "at" | "deleted">[];
  reviewCount: number;
  statsVisitedAt: unknown;
  focus: FocusKey;
}) {
  const today = (activity: Activity) => !activity.deleted && activity.at >= day.start && activity.at < day.end;
  const practice = attempts.filter(today);
  const drillResults = drills.filter(today);
  const warmup = counter(practice.filter((a) => a.kind === "recog" && a.caseKey.startsWith("PLL:")).length, SESSION_TARGETS.warmup, "answers");
  const review = counter(practice.filter((a) => a.kind === "exec").length, SESSION_TARGETS.review, "attempts");
  if (reviewCount === 0) {
    review.done = true;
    review.label = "Queue clear";
  }
  const focuses: Record<FocusKey, StepProgress> = {
    Cross: counter(drillResults.filter((d) => d.drill === "cross").length, SESSION_TARGETS.cross, "crosses"),
    F2L: counter(drillResults.filter((d) => d.drill === "metronome").length, SESSION_TARGETS.metronome, "sessions"),
    OLL: counter(practice.filter((a) => a.kind === "recog" && a.caseKey.startsWith("OLL:")).length, SESSION_TARGETS.oll, "OLL answers"),
    PLL: counter(drillResults.filter((d) => d.drill === "pll-attack").length, SESSION_TARGETS.pllAttack, "attack"),
  };
  const timed = counter(solves.filter(today).length, SESSION_TARGETS.solves, "solves");
  const viewed = typeof statsVisitedAt === "number" && today({ at: statsVisitedAt });
  const lookBack = { ...counter(viewed ? 1 : 0, 1, "visit"), label: viewed ? "Stats viewed" : "Open Stats" };
  const steps = [warmup, review, focuses[focus], timed, lookBack];
  return { steps, nextIndex: steps.findIndex((step) => !step.done), completed: steps.filter((step) => step.done).length };
}
