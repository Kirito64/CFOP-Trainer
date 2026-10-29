import { describe, expect, test } from "bun:test";
import { localDay } from "../../lib/localDay";
import { sessionProgress } from "./sessionProgress";

const day = localDay(new Date(2026, 9, 29, 12).getTime());
const at = day.start + 1000;
const answer = (kind: "exec" | "recog", caseKey: "PLL:T" | "OLL:OLL 1" = "PLL:T", timestamp = at) => ({ kind, caseKey, at: timestamp });
const result = (drill: string, timestamp = at) => ({ drill, at: timestamp });
const base = { day, attempts: [], drills: [], solves: [], reviewCount: 5, statsVisitedAt: undefined, focus: "Cross" as const };

describe("daily session progress", () => {
  test("starts empty and highlights the first unfinished step", () => {
    const session = sessionProgress(base);
    expect(session.completed).toBe(0);
    expect(session.nextIndex).toBe(0);
    expect(session.steps.map((s) => s.count)).toEqual([0, 0, 0, 0, 0]);
  });

  test("counts only today's PLL recognition, including incorrect answers", () => {
    const attempts = [
      ...Array.from({ length: 24 }, () => ({ ...answer("recog"), ok: false })),
      answer("recog", "PLL:T", day.start),
      answer("recog", "OLL:OLL 1"), answer("exec"),
      answer("recog", "PLL:T", day.start - 1), answer("recog", "PLL:T", day.end),
      { ...answer("recog"), deleted: true },
    ];
    const session = sessionProgress({ ...base, attempts });
    expect(session.steps[0]).toMatchObject({ count: 25, target: 25, done: true });
    expect(session.nextIndex).toBe(1);
  });

  test("review completes at 20 saved trainer attempts or a clear queue", () => {
    const attempts = Array.from({ length: 19 }, () => answer("exec"));
    expect(sessionProgress({ ...base, attempts }).steps[1].done).toBe(false);
    expect(sessionProgress({ ...base, attempts: [...attempts, answer("exec")] }).steps[1].done).toBe(true);
    expect(sessionProgress({ ...base, reviewCount: 0 }).steps[1]).toMatchObject({ done: true, label: "Queue clear" });
    expect(sessionProgress({ ...base, attempts: [answer("exec", "PLL:T", day.start - 1)] }).steps[1].count).toBe(0);
  });

  test("focus counts the matching activity and excludes deleted results", () => {
    const drills = [
      ...Array.from({ length: 15 }, () => result("cross")),
      ...Array.from({ length: 3 }, () => result("metronome")),
      result("pll-attack"), result("tps"), result("cross", day.start - 1),
      result("cross", day.end), { ...result("cross"), deleted: true },
    ];
    for (const [focus, count, target] of [["Cross", 15, 15], ["F2L", 3, 3], ["PLL", 1, 1]] as const) {
      expect(sessionProgress({ ...base, drills, focus }).steps[2]).toMatchObject({ count, target, done: true });
      expect(sessionProgress({ ...base, drills: drills.filter((d) => d.drill === "tps"), focus }).steps[2].done).toBe(false);
    }
    const attempts = [answer("recog"), ...Array.from({ length: 25 }, () => answer("recog", "OLL:OLL 1")), answer("exec", "OLL:OLL 1")];
    expect(sessionProgress({ ...base, attempts, focus: "OLL" }).steps[2]).toMatchObject({ count: 25, done: true });
    expect(sessionProgress({ ...base, attempts, focus: "OLL" }).steps[0].count).toBe(1);
  });

  test("24 solves complete the timed step, including DNF, across sessions", () => {
    const solves = [
      ...Array.from({ length: 23 }, (_, i) => ({ at, sessionId: `session-${i}` })),
      { at, penalty: "DNF" },
      { at: day.start - 1 }, { at: day.end }, { at, deleted: true },
    ];
    expect(sessionProgress({ ...base, solves }).steps[3]).toMatchObject({ count: 24, done: true });
  });

  test("Stats must have been visited today, with a valid timestamp", () => {
    for (const statsVisitedAt of [undefined, null, "today", NaN, day.start - 1, day.end]) {
      expect(sessionProgress({ ...base, statsVisitedAt }).steps[4].done).toBe(false);
    }
    expect(sessionProgress({ ...base, statsVisitedAt: day.start }).steps[4].done).toBe(true);
  });

  test("all done clears the highlight and next midnight resets activity", () => {
    const activity = {
      ...base,
      attempts: Array.from({ length: 25 }, () => answer("recog")),
      reviewCount: 0,
      drills: Array.from({ length: 15 }, () => result("cross")),
      solves: Array.from({ length: 24 }, () => ({ at })),
      statsVisitedAt: at,
    };
    expect(sessionProgress(activity)).toMatchObject({ nextIndex: -1, completed: 5 });
    const tomorrow = sessionProgress({ ...activity, day: localDay(day.end), reviewCount: 3 });
    expect(tomorrow.completed).toBe(0);
    expect(tomorrow.nextIndex).toBe(0);
    expect(tomorrow.steps.map((s) => s.count)).toEqual([0, 0, 0, 0, 0]);
  });
});
