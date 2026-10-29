import type { CaseKey } from "../../data/types";

export interface Item {
  key: CaseKey;
  /** F2L only: train the mirrored, front-left version. */
  mirror: boolean;
}

export interface CaseHistory {
  /** Recent execution times in ms (successful attempts). */
  times: number[];
  misses: number;
  attempts: number;
}

export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Put a missed item back a few places later so it's retried before the session ends. */
export function requeue(queue: Item[], item: Item, gap = 3 + Math.floor(Math.random() * 3)): Item[] {
  const q = [...queue];
  q.splice(Math.min(gap, q.length), 0, item);
  return q;
}

/** Weight for free drilling: slow, error-prone and unseen cases come up more often. */
export function drillWeight(h: CaseHistory | undefined, targetMs: number): number {
  if (!h || h.attempts === 0) return 2.5;
  const sorted = h.times.toSorted((a, b) => a - b);
  const med = sorted.length ? sorted[sorted.length >> 1] : targetMs * 2;
  const slowness = Math.max(0, med / targetMs - 1);
  const missRate = h.misses / h.attempts;
  return 1 + 2 * slowness + 4 * missRate;
}

/** Weighted pick that never repeats the previous case when there's a choice. */
export function pickWeighted(items: Item[], weight: (i: Item) => number, previous?: Item): Item {
  const pool = items.length > 1 && previous ? items.filter((i) => i.key !== previous.key || i.mirror !== previous.mirror) : items;
  const ws = pool.map(weight);
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((r -= ws[i]) <= 0) return pool[i];
  return pool[pool.length - 1];
}
