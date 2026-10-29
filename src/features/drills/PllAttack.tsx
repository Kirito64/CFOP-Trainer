import { TimerDisplay } from "../../components/TimerDisplay";
import { fmt, Kbd } from "../../components/ui";
import { getSet } from "../../data/algsets";
import { addDrillResult, useDrillResults } from "../../db/drills";
import { useSettings } from "../../db/settings";
import { useStackmat } from "../../lib/useStackmat";

// A common attack order: grouped so each alg starts comfortably from where the last one left the grip.
const ORDER = ["Ua", "Ub", "Z", "H", "Aa", "Ab", "E", "T", "F", "Ja", "Jb", "Ra", "Rb", "V", "Y", "Na", "Nb", "Ga", "Gb", "Gc", "Gd"];

export function PllAttack() {
  const settings = useSettings();
  const results = useDrillResults("pll-attack");
  const timer = useStackmat({
    holdMs: settings.holdMs,
    onStop: (ms) => void addDrillResult("pll-attack", Math.floor(ms)),
  });
  const best = results?.length ? Math.min(...results.map((r) => r.score)) : null;
  const names = new Set(getSet("PLL").cases.map((c) => c.id));

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
      <div className="flex flex-col items-center">
        <TimerDisplay phase={timer.phase} ms={timer.elapsed} padProps={timer.padProps} />
        <p className="mt-4 text-sm text-ink-3">
          Hold <Kbd>Space</Kbd> to start, any key to stop. Start from solved and do every PLL once.
        </p>
        <ol className="mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
          {ORDER.filter((n) => names.has(n)).map((n, i) => (
            <li key={n} className="rounded-md border border-rule bg-panel px-2.5 py-1 font-display text-xl font-semibold">
              <span className="mr-1 text-sm font-normal text-ink-3">{i + 1}</span>
              {n}
            </li>
          ))}
        </ol>
      </div>
      <aside>
        <h2 className="mb-2 font-display text-xl font-semibold">Your attacks</h2>
        <p className="mb-3 text-ink-2">
          Best <span className="font-display text-2xl text-ink">{fmt(best)}</span>
        </p>
        <ol className="max-h-80 overflow-y-auto">
          {results
            ?.toReversed()
            .slice(0, 30)
            .map((r) => (
              <li key={r.id} className="flex justify-between border-b border-rule py-1">
                <span className="text-sm text-ink-3">{new Date(r.at).toLocaleDateString()}</span>
                <span className="font-display text-lg">{fmt(r.score)}</span>
              </li>
            ))}
        </ol>
      </aside>
    </div>
  );
}
