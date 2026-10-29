import { DefaultScheduler, type DefaultSchedulerCard, Rating } from "ts-fsrs";
import type { AlgSetId, CaseKey } from "../data/types";
import { type CaseProgress, db, now } from "../db/db";
import { blankProgress } from "../db/progress";

export { Rating };
export type Grade = (typeof Rating)["Again" | "Hard" | "Good" | "Easy"];

type Scheduler = Awaited<ReturnType<typeof DefaultScheduler<"FSRS-7">>>;
type Card = DefaultSchedulerCard<"FSRS-7">;

let scheduler: Promise<Scheduler> | undefined;
const getScheduler = () => (scheduler ??= DefaultScheduler({ version: "FSRS-7", desiredRetention: 0.9, enableFuzz: true, maximumInterval: 120 }));

const DATE_FIELDS = ["dueAt", "lastReviewAt"] as const;
const revive = (raw: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, DATE_FIELDS.includes(k as never) && typeof v === "string" ? new Date(v) : v])) as Card;
const serialise = (card: Card) => JSON.parse(JSON.stringify(card)) as Record<string, unknown>;

/** Execution time (ms) that counts as fluent for a case of each set, roughly what a sub-10 solver does. */
export const TARGET_MS: Record<AlgSetId, number> = { OLL: 1300, PLL: 1600, COLL: 1700, F2L: 1000, WV: 1400 };

/** Turn an attempt into an FSRS grade from objective signals, not self-rating. */
export function gradeAttempt({ ok, ms, set, personalMedian }: { ok: boolean; ms: number; set: AlgSetId; personalMedian: number | null }): Grade {
  if (!ok) return Rating.Again;
  const target = TARGET_MS[set];
  const slow = Math.max(target * 1.6, (personalMedian ?? target) * 1.4);
  if (ms > slow) return Rating.Hard;
  if (ms <= target) return Rating.Easy;
  return Rating.Good;
}

export async function review(key: CaseKey, grade: Grade, at = new Date()) {
  const s = await getScheduler();
  await db.transaction("rw", db.progress, async () => {
    const p: CaseProgress = (await db.progress.get(key)) ?? blankProgress(key);
    const card = p.card ? revive(p.card) : s.newCard({ now: at });
    const { card: next } = s.review({ card, grade, now: at });
    // A learning case that now holds for a week or more has been learned.
    const learned = p.status === "learning" && next.scheduledDays >= 7;
    await db.progress.put({
      ...p,
      status: p.status === "new" ? "learning" : learned ? "known" : p.status,
      card: serialise(next),
      dueAt: next.dueAt.getTime(),
      introducedAt: p.introducedAt ?? at.getTime(),
      // A replacement alg that has stuck finishes the upgrade.
      ...(learned && p.upgrade?.started ? { upgrade: undefined } : {}),
      updatedAt: now(),
    });
  });
}

export const GRADE_LABEL: Record<Grade, string> = {
  [Rating.Again]: "Again",
  [Rating.Hard]: "Hard",
  [Rating.Good]: "Good",
  [Rating.Easy]: "Easy",
};

const startOfToday = () => new Date().setHours(0, 0, 0, 0);

/**
 * Today's review queue: cards that are due, known cases that have never been scheduled
 * (so the scheduler learns which ones are weak), then new cases up to the daily cap.
 */
export async function dailyQueue({ sets, newPerDay, unscheduledPerDay = 12 }: { sets: AlgSetId[]; newPerDay: number; unscheduledPerDay?: number }) {
  const all = (await db.progress.toArray()).filter((p) => !p.deleted && sets.some((s) => p.id.startsWith(`${s}:`)));
  const t = now();
  const due = all.filter((p) => p.dueAt != null && p.dueAt <= t).sort((a, b) => a.dueAt! - b.dueAt!);
  const unscheduled = all.filter((p) => p.status === "known" && !p.card).slice(0, unscheduledPerDay);
  const introducedToday = all.filter((p) => (p.introducedAt ?? 0) >= startOfToday() && p.status === "learning").length;
  const fresh = all.filter((p) => p.status === "learning" && !p.card).slice(0, Math.max(0, newPerDay - introducedToday));
  return { due: due.map((p) => p.id), unscheduled: unscheduled.map((p) => p.id), fresh: fresh.map((p) => p.id) };
}
