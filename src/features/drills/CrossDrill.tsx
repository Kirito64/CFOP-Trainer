import { useCallback, useEffect, useState } from "react";
import { Button, fmt, Kbd, Tabs } from "../../components/ui";
import { crossLength, optimalCross, toSolvingFrame } from "../../cube/cross";
import { addDrillResult, useDrillResults } from "../../db/drills";

type Target = "ladder" | 4 | 5 | 6 | 7 | 8;
type Stage = "ready" | "planning" | "solving" | "report";
type Outcome = "optimal" | "solved" | "missed";

const FACES = ["U", "D", "R", "L", "F", "B"];
const AXIS: Record<string, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };

/** A 25-move random-move scramble (no repeated faces, no redundant same-axis triples). */
function randomMoves(n = 25): string {
  const out: string[] = [];
  while (out.length < n) {
    const f = FACES[Math.floor(Math.random() * 6)];
    const prev = out.at(-1)?.[0];
    const prev2 = out.at(-2)?.[0];
    if (f === prev || (prev && prev2 && AXIS[f] === AXIS[prev] && AXIS[f] === AXIS[prev2])) continue;
    out.push(f + ["", "'", "2"][Math.floor(Math.random() * 3)]);
  }
  return out.join(" ");
}

function scrambleWithCross(length: number): { scramble: string; optimal: string } {
  for (let i = 0; i < 5000; i++) {
    const scramble = randomMoves();
    const solving = toSolvingFrame(scramble);
    if (crossLength(solving) === length) return { scramble, optimal: optimalCross(solving) };
  }
  const scramble = randomMoves();
  return { scramble, optimal: optimalCross(toSolvingFrame(scramble)) };
}

interface Attempt {
  level: number;
  outcome: Outcome;
  planMs: number;
  pair?: boolean;
}

/** Ladder: move up after 8 of the last 10 at a level were optimal, down after 5 misses. */
function nextLevel(level: number, history: Attempt[]): number {
  const recent = history.filter((a) => a.level === level).slice(-10);
  if (recent.length >= 10 && recent.filter((a) => a.outcome === "optimal").length >= 8) return Math.min(8, level + 1);
  if (recent.filter((a) => a.outcome === "missed").length >= 5) return Math.max(4, level - 1);
  return level;
}

export function CrossDrill() {
  const [target, setTarget] = useState<Target>("ladder");
  const [withPair, setWithPair] = useState(false);
  const results = useDrillResults("cross");
  const [history, setHistory] = useState<Attempt[]>([]);
  const [level, setLevel] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("ready");
  const [current, setCurrent] = useState<{ scramble: string; optimal: string } | null>(null);
  const [planStart, setPlanStart] = useState(0);
  const [planMs, setPlanMs] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // Resume the ladder where the last session left off.
  useEffect(() => {
    if (level != null || !results) return;
    const last = results.filter((r) => typeof r.detail?.level === "number").at(-1);
    setLevel((last?.detail?.level as number) ?? 5);
  }, [results, level]);

  const length = target === "ladder" ? (level ?? 5) : target;

  const deal = useCallback(() => {
    setCurrent(scrambleWithCross(length));
    setStage("ready");
    setOutcome(null);
  }, [length]);

  useEffect(() => {
    if (level != null) deal();
  }, [deal, level]);

  const record = useCallback(
    async (o: Outcome, pair?: boolean) => {
      const a: Attempt = { level: length, outcome: o, planMs, pair };
      const h = [...history, a];
      setHistory(h);
      await addDrillResult("cross", o === "optimal" ? 1 : o === "solved" ? 0.5 : 0, { level: length, outcome: o, planMs, pair, optimal: current?.optimal });
      if (target === "ladder") {
        const next = nextLevel(length, h);
        if (next !== length) setLevel(next);
        else deal();
      } else deal();
    },
    [history, length, planMs, current, target, deal],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (stage === "ready") {
          setPlanStart(performance.now());
          setStage("planning");
        } else if (stage === "planning") {
          setPlanMs(performance.now() - planStart);
          setStage("solving");
        } else if (stage === "solving") setStage("report");
      }
      if (stage === "report") {
        const o = ({ "1": "optimal", "2": "solved", "3": "missed" } as Record<string, Outcome>)[e.key];
        if (o && !withPair) void record(o);
        else if (o) setOutcome(o);
        if (outcome && withPair && (e.key === "y" || e.key === "n")) void record(outcome, e.key === "y");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, planStart, record, withPair, outcome]);

  const session = history.slice(-20);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
      <div>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Tabs<Target>
            label="Cross length"
            value={target}
            onChange={setTarget}
            options={[
              { value: "ladder", label: `Ladder${level ? ` (${level})` : ""}` },
              { value: 4, label: "4" },
              { value: 5, label: "5" },
              { value: 6, label: "6" },
              { value: 7, label: "7" },
              { value: 8, label: "8" },
            ]}
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-[var(--steel)]" checked={withPair} onChange={(e) => setWithPair(e.target.checked)} />
            Also predict the first pair
          </label>
        </div>

        {current && (
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-ink-3">Optimal cross: {length} moves. Scramble with white on top, green in front.</p>
            <p className={`alg my-4 text-[clamp(1.3rem,2.8vw,1.9rem)] leading-snug ${stage === "solving" ? "opacity-0" : ""}`}>{current.scramble}</p>

            {stage === "ready" && (
              <p className="text-ink-2">
                Turn the cube white side down and press <Kbd>Space</Kbd> to start planning.
              </p>
            )}
            {stage === "planning" && <PlanClock start={planStart} withPair={withPair} />}
            {stage === "solving" && (
              <p className="max-w-md text-lg text-ink-2">
                Close your eyes and solve the cross{withPair ? ", then the first pair if you can," : ""} without looking. Press <Kbd>Space</Kbd>{" "}
                when you're done.
              </p>
            )}
            {stage === "report" && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-ink-2">Planned in {fmt(planMs)} s. An optimal cross, white on the bottom:</p>
                <p className="alg text-3xl">{current.optimal || "Already solved"}</p>
                {!outcome ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => (withPair ? setOutcome("optimal") : record("optimal"))}>
                      <Kbd>1</Kbd> Solved in {length}
                    </Button>
                    <Button onClick={() => (withPair ? setOutcome("solved") : record("solved"))}>
                      <Kbd>2</Kbd> Solved, more moves
                    </Button>
                    <Button onClick={() => (withPair ? setOutcome("missed") : record("missed"))}>
                      <Kbd>3</Kbd> Missed
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <span className="self-center text-ink-2">First pair right?</span>
                    <Button onClick={() => record(outcome, true)}>
                      <Kbd>Y</Kbd> Yes
                    </Button>
                    <Button onClick={() => record(outcome, false)}>
                      <Kbd>N</Kbd> No
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <aside>
        <h2 className="mb-2 font-display text-xl font-semibold">This session</h2>
        <table className="mb-3 w-full">
          <tbody className="divide-y divide-rule">
            <tr>
              <th className="py-1 text-left font-normal text-ink-2">Optimal</th>
              <td className="text-right font-display text-xl">{session.filter((a) => a.outcome === "optimal").length}</td>
            </tr>
            <tr>
              <th className="py-1 text-left font-normal text-ink-2">Solved</th>
              <td className="text-right font-display text-xl">{session.filter((a) => a.outcome !== "missed").length}</td>
            </tr>
            <tr>
              <th className="py-1 text-left font-normal text-ink-2">Attempts</th>
              <td className="text-right font-display text-xl">{session.length}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-ink-3">
          The ladder moves up a move after 8 optimal crosses in your last 10 at a level. Sub-10 solvers plan the cross plus often the first pair in
          inspection.
        </p>
      </aside>
    </div>
  );
}

function PlanClock({ start, withPair }: { start: number; withPair: boolean }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(performance.now() - start), 100);
    return () => clearInterval(id);
  }, [start]);
  return (
    <div className="flex flex-col items-center">
      <div className={`font-display text-8xl font-semibold ${t > 15000 ? "text-hold" : t > 12000 ? "text-warn" : ""}`}>{(t / 1000).toFixed(1)}</div>
      <p className="text-ink-2">
        Plan the whole cross{withPair ? " and find your first pair" : ""}. Press <Kbd>Space</Kbd> when you know it. Aim for under 15 seconds.
      </p>
    </div>
  );
}
