import { useState } from "react";
import { TimerDisplay } from "../../components/TimerDisplay";
import { Kbd, Tabs } from "../../components/ui";
import { parseAlg } from "../../cube/cube";
import { getSet } from "../../data/algsets";
import { type AlgSetId, caseKey } from "../../data/types";
import { db } from "../../db/db";
import { addDrillResult, useDrillResults } from "../../db/drills";
import { chosenAlg } from "../../db/progress";
import { useSettings } from "../../db/settings";
import { useStackmat } from "../../lib/useStackmat";

const REPS = 5;
/** Moves in an alg, not counting cube rotations. */
const moveCount = (alg: string) => parseAlg(alg).filter((m) => !"xyz".includes(m.letter)).length;

export function TpsSprint() {
  const settings = useSettings();
  const [set, setSet] = useState<AlgSetId>("PLL");
  const [caseId, setCaseId] = useState(getSet("PLL").cases[0].id);
  const [alg, setAlg] = useState(getSet("PLL").cases[0].algs[0]);
  const results = useDrillResults("tps");

  const choose = async (s: AlgSetId, id: string) => {
    setSet(s);
    setCaseId(id);
    setAlg(chosenAlg(caseKey(s, id), await db.progress.get(caseKey(s, id))));
  };

  const moves = moveCount(alg) * REPS;
  const timer = useStackmat({
    holdMs: settings.holdMs,
    onStop: (ms) => void addDrillResult("tps", Math.round((moves / (ms / 1000)) * 100) / 100, { case: caseKey(set, caseId), ms: Math.floor(ms) }),
  });

  const mine = results?.filter((r) => r.detail?.case === caseKey(set, caseId)) ?? [];
  const best = mine.length ? Math.max(...mine.map((r) => r.score)) : null;
  const tps = timer.phase === "stopped" ? moves / (timer.elapsed / 1000) : null;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
        <Tabs<AlgSetId>
          label="Set"
          value={set}
          onChange={(s) => void choose(s, getSet(s).cases[0].id)}
          options={(["PLL", "OLL", "COLL", "F2L"] as const).map((s) => ({ value: s, label: s }))}
        />
        <label className="sr-only" htmlFor="sprint-case">
          Case
        </label>
        <select id="sprint-case" value={caseId} onChange={(e) => void choose(set, e.target.value)} className="rounded-md border border-rule bg-panel px-2 py-1.5">
          {getSet(set).cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name === c.id ? c.id : `${c.id}: ${c.name}`}
            </option>
          ))}
        </select>
      </div>
      <p className="alg mb-6 text-center text-3xl">
        {alg} <span className="font-sans text-base text-ink-3">× {REPS}</span>
      </p>
      <TimerDisplay phase={timer.phase} ms={timer.elapsed} padProps={timer.padProps} size="lg" />
      {tps != null ? (
        <p className="mt-4 text-lg">
          <span className="font-display text-3xl font-semibold">{tps.toFixed(2)}</span> turns a second
          {best != null && <span className="ml-2 text-ink-3">(best {best.toFixed(2)})</span>}
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-3">
          Hold <Kbd>Space</Kbd> to start, do the alg {REPS} times, any key to stop.
          {best != null && ` Best for this alg: ${best.toFixed(2)} turns a second.`}
        </p>
      )}
      {mine.length > 1 && <p className="mt-2 text-sm text-ink-3">Last {Math.min(mine.length, 5)}: {mine.slice(-5).map((r) => r.score.toFixed(2)).join(", ")}</p>}
      <p className="mt-6 max-w-[60ch] text-center text-sm text-ink-3">
        Sub-10 last layers run at 9 to 10 turns a second. Time a slow alg here, change the fingertricks, and time it again.
      </p>
    </div>
  );
}
