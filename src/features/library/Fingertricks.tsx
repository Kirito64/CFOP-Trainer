import { useState } from "react";
import { Tabs } from "../../components/ui";
import { mirrorAlg } from "../../cube/cube";
import { FINGERTRICK_OPTIONS, fingertricks, type Hand, handOf } from "../../cube/fingertricks";
import type { CaseKey } from "../../data/types";
import type { CaseProgress } from "../../db/db";
import { updateProgress } from "../../db/progress";

const HAND_STYLE: Record<Hand, string> = {
  right: "bg-steel-soft text-steel",
  left: "bg-panel-2 text-ink",
  both: "border border-rule text-ink-2",
};
const HAND_LABEL: Record<Hand, string> = { right: "Right", left: "Left", both: "Both" };

/** Move-by-move fingertricks for the chosen alg: suggested from standard technique, editable per move. */
export function Fingertricks({ caseKey, alg, progress, f2l }: { caseKey: CaseKey; alg: string; progress: CaseProgress; f2l: boolean }) {
  const [slot, setSlot] = useState<"FR" | "FL">("FR");
  const [editing, setEditing] = useState<number | null>(null);
  const shown = f2l && slot === "FL" ? mirrorAlg(alg) : alg;
  const mine = progress.fingertricks?.[shown] ?? {};
  const suggested = fingertricks(shown);

  const save = (i: number, value: string) => {
    const all = { ...progress.fingertricks };
    const next = { ...mine };
    if (value && value !== suggested[i].how) next[i] = value;
    else delete next[i];
    if (Object.keys(next).length) all[shown] = next;
    else delete all[shown];
    setEditing(null);
    return updateProgress(caseKey, { fingertricks: all });
  };

  return (
    <section aria-labelledby="fingertricks-heading">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 id="fingertricks-heading" className="font-display text-xl font-semibold">
          Fingertricks
        </h2>
        {f2l && (
          <Tabs<"FR" | "FL">
            label="Slot"
            value={slot}
            onChange={setSlot}
            options={[
              { value: "FR", label: "Front right" },
              { value: "FL", label: "Front left" },
            ]}
          />
        )}
      </div>
      <p className="mb-3 max-w-[65ch] text-sm text-ink-2">
        Suggested from standard technique, starting from home grip with both thumbs on the front. Click a move to change it to how you do it.
      </p>
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
        {suggested.map((s, i) => {
          const how = mine[i] ?? s.how;
          const hand = mine[i] ? handOf(how) : s.hand;
          const flagged = s.unsure && !mine[i];
          return (
            <li key={`${shown}-${i}`} className="flex flex-col">
              {s.regrip && <p className="mb-1 text-xs font-semibold text-warn">Regrip first: {s.regrip.toLowerCase()}</p>}
              {editing === i ? (
                <form
                  className="flex h-full flex-col gap-1.5 rounded-lg border border-steel bg-panel p-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(i, String(new FormData(e.currentTarget).get("how") ?? "").trim());
                  }}
                >
                  <span className="alg text-lg">{s.move}</span>
                  <label className="sr-only" htmlFor={`ft-${i}`}>
                    How you do {s.move}
                  </label>
                  <input
                    id={`ft-${i}`}
                    name="how"
                    list="fingertrick-options"
                    defaultValue={how}
                    autoFocus
                    onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                    className="w-full rounded-md border border-rule bg-panel-2 px-2 py-1 text-sm"
                  />
                  <div className="flex gap-2 text-xs">
                    <button type="submit" className="font-semibold text-steel">
                      Save
                    </button>
                    {mine[i] && (
                      <button type="button" className="text-ink-2" onClick={() => void save(i, "")}>
                        Use suggestion
                      </button>
                    )}
                    <button type="button" className="ml-auto text-ink-3" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(i)}
                  className={`flex h-full flex-col items-start gap-1 rounded-lg border bg-panel p-2.5 text-left hover:border-ink-3 ${flagged ? "border-dashed border-warn" : "border-rule"}`}
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="alg text-lg">{s.move}</span>
                    <span className={`ml-auto rounded px-1.5 text-xs font-semibold ${HAND_STYLE[hand]}`}>{HAND_LABEL[hand]}</span>
                  </span>
                  <span className="text-sm leading-snug">{how}</span>
                  {s.withPrevious && <span className="text-xs text-ink-3">Together with the move before</span>}
                  {flagged && <span className="text-xs text-warn">No standard trick. Pick yours.</span>}
                  {mine[i] && <span className="text-xs text-steel">Yours</span>}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <datalist id="fingertrick-options">
        {FINGERTRICK_OPTIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </section>
  );
}
