import { useLiveQuery } from "dexie-react-hooks";
import { type ReactNode, useState } from "react";
import { Link, useParams } from "react-router";
import { CaseView } from "../../components/CubeView";
import { Player } from "../../components/Player";
import { Button, fmt, Tabs } from "../../components/ui";
import { caseState, mirrorAlg, parseAlg } from "../../cube/cube";
import { checkAlg } from "../../cube/validate";
import { getCase, VIEW } from "../../data/algsets";
import { type AlgSetId, type CaseKey, caseKey } from "../../data/types";
import { type CaseProgress, db, type LearnStatus } from "../../db/db";
import { chosenAlg, keepOldAlg, learnInstead, markOutdated, setStatus, updateProgress, useProgress } from "../../db/progress";
import { median } from "../../lib/stats";
import { Fingertricks } from "./Fingertricks";

export default function CasePage() {
  const params = useParams();
  const setId = params.set as AlgSetId;
  const key = caseKey(setId, decodeURIComponent(params.caseId ?? ""));
  const found = getCase(key);
  const p = useProgress(key);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!found) return <p>That case doesn't exist.</p>;
  const { def } = found;
  const alg = chosenAlg(key, p);
  const { view, mask } = VIEW[setId];

  const upgrade = p.upgrade;
  const choosingBetter = !!upgrade && !upgrade.started;

  const saveCustom = async () => {
    const err = checkAlg(setId, custom, def.algs[0]);
    setError(err);
    if (!err) {
      const choice = { algIndex: -1, customAlg: custom.trim() };
      await (choosingBetter ? learnInstead(key, p, choice) : updateProgress(key, choice));
      setCustom("");
    }
  };
  const learnButton = (choice: { algIndex: number; customAlg?: string }, a: string) =>
    choosingBetter && a !== upgrade?.from ? (
      <Button className="text-sm" onClick={() => learnInstead(key, p, choice)}>
        Learn this instead
      </Button>
    ) : undefined;
  const tags = (a: string, i: number) => [...(i === 0 ? ["Recommended"] : []), ...(upgrade && a === upgrade.from ? ["Your old alg"] : [])];

  return (
    <article className="max-w-5xl">
      <Link to={`/library/${setId}`} className="text-sm text-ink-2 hover:text-ink">
        ← {found.set.name}
      </Link>
      <header className="mt-2 mb-6">
        <h1 className="font-display text-4xl font-semibold">{def.name === def.id ? def.id : `${def.id}: ${def.name}`}</h1>
        <p className="text-ink-2">
          {def.group}
          {def.probability ? `, comes up 1 in ${Math.round(1 / def.probability)} solves` : ""}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-xl bg-panel p-5">
            <CaseView view={view} mask={mask} state={caseState(alg)} size={150} title={def.name} />
            <Player alg={alg} className="min-h-56 min-w-0" />
          </div>
          {def.recognition && (
            <div>
              <h2 className="mb-1 font-display text-xl font-semibold">How to recognise it</h2>
              <p className="max-w-[65ch] text-ink-2">{def.recognition}</p>
            </div>
          )}
          {def.notes && (
            <div>
              <h2 className="mb-1 font-display text-xl font-semibold">Notes</h2>
              <p className="max-w-[65ch] text-ink-2">{def.notes}</p>
            </div>
          )}
          <CaseStats caseKey={key} />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold">Status</h2>
            <Tabs<LearnStatus>
              label="Learning status"
              value={p.status}
              onChange={(s) => setStatus(key, s)}
              options={[
                { value: "new", label: "Not learned" },
                { value: "learning", label: "Learning" },
                { value: "known", label: "Known" },
              ]}
            />
          </div>

          <fieldset>
            <legend className="mb-2 font-display text-xl font-semibold">Your alg</legend>
            <ul className="divide-y divide-rule rounded-lg border border-rule bg-panel">
              {def.algs.map((a, i) => (
                <AlgRow
                  key={a}
                  alg={a}
                  checked={p.algIndex === i}
                  onSelect={() => updateProgress(key, { algIndex: i })}
                  mirror={setId === "F2L"}
                  tags={tags(a, i)}
                  action={learnButton({ algIndex: i }, a)}
                />
              ))}
              {p.customAlg && (
                <AlgRow
                  alg={p.customAlg}
                  checked={p.algIndex === -1}
                  onSelect={() => updateProgress(key, { algIndex: -1 })}
                  label="Your own"
                  tags={tags(p.customAlg, -1)}
                  action={learnButton({ algIndex: -1, customAlg: p.customAlg }, p.customAlg)}
                />
              )}
            </ul>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void saveCustom();
              }}
            >
              <label className="sr-only" htmlFor="custom-alg">
                Your own alg
              </label>
              <input
                id="custom-alg"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Use your own alg, e.g. R U R' U R U2 R'"
                className="alg min-w-0 flex-1 rounded-md border border-rule bg-panel px-3 py-1.5 text-lg"
              />
              <Button type="submit" disabled={!custom.trim()}>
                Check and use
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-hold">{error}</p>}
            <AlgUpgrade caseKey={key} p={p} alg={alg} />
          </fieldset>

          <Fingertricks key={alg} caseKey={key} alg={alg} progress={p} f2l={setId === "F2L"} />

          <div>
            <label htmlFor="notes" className="mb-2 block font-display text-xl font-semibold">
              Your notes
            </label>
            <textarea
              id="notes"
              defaultValue={p.notes ?? ""}
              key={p.updatedAt ? "loaded" : "blank"}
              onBlur={(e) => e.target.value !== (p.notes ?? "") && updateProgress(key, { notes: e.target.value })}
              rows={3}
              placeholder="Recognition cues, fingertricks, what you keep getting wrong. Shown when you miss this case."
              className="w-full rounded-md border border-rule bg-panel px-3 py-2"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function AlgRow({
  alg,
  checked,
  onSelect,
  label,
  mirror,
  tags = [],
  action,
}: {
  alg: string;
  checked: boolean;
  onSelect: () => void;
  label?: string;
  mirror?: boolean;
  tags?: string[];
  action?: ReactNode;
}) {
  return (
    <li className={`flex flex-wrap items-center gap-x-3 ${checked ? "bg-steel-soft" : "hover:bg-panel-2"}`}>
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-4 py-3">
        <input type="radio" name="alg" checked={checked} onChange={onSelect} className="mt-1.5 accent-[var(--steel)]" />
        <span className="min-w-0 flex-1">
          <span className="alg block text-xl">{alg}</span>
          <span className="text-sm text-ink-3">
            {label ? `${label}, ` : ""}
            {parseAlg(alg).filter((m) => !"xyz".includes(m.letter)).length} moves
            {tags.map((t) => (
              <span key={t} className={`ml-2 rounded px-1.5 text-xs font-semibold ${t === "Recommended" ? "bg-panel-2 text-steel" : "bg-panel-2 text-warn"}`}>
                {t}
              </span>
            ))}
            {mirror && <span className="ml-2">front-left: <span className="alg">{mirrorAlg(alg)}</span></span>}
          </span>
        </span>
      </label>
      {action && <div className="pr-4 pb-3 pl-11 sm:pb-0 sm:pl-0">{action}</div>}
    </li>
  );
}

/** Flag the alg you know as outdated, then learn a better one in its place. */
function AlgUpgrade({ caseKey, p, alg }: { caseKey: CaseKey; p: CaseProgress; alg: string }) {
  const upgrade = p.upgrade;
  if (!upgrade)
    return p.status === "new" ? null : (
      <div className="mt-3">
        <Button variant="quiet" className="text-sm" onClick={() => markOutdated(caseKey, p)}>
          My alg is outdated, I want a better one
        </Button>
      </div>
    );
  if (!upgrade.started)
    return (
      <div className="mt-4 rounded-lg border border-warn p-4">
        <p className="font-semibold">You marked your alg as outdated</p>
        <p className="alg mt-1 text-lg text-ink-2">{upgrade.from}</p>
        <p className="mt-2 text-sm text-ink-2">
          Pick a better one above with Learn this instead, or add your own. Until then you keep reviewing the old one.
        </p>
        <Button variant="quiet" className="mt-2 -ml-4 text-sm" onClick={() => updateProgress(caseKey, { upgrade: undefined })}>
          Keep my alg after all
        </Button>
      </div>
    );
  return (
    <div className="mt-4 rounded-lg border border-steel p-4">
      <p className="font-semibold">Switching to a better alg</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-ink-2">New</dt>
        <dd className="alg text-lg">{alg}</dd>
        <dt className="text-ink-2">Old</dt>
        <dd className="alg text-lg text-ink-3 line-through">{upgrade.from}</dd>
      </dl>
      <p className="mt-2 text-sm text-ink-2">It's back in your daily review as a new case until it holds for a week.</p>
      <Button variant="quiet" className="mt-2 -ml-4 text-sm" onClick={() => keepOldAlg(caseKey, p)}>
        Go back to my old alg
      </Button>
    </div>
  );
}

function CaseStats({ caseKey }: { caseKey: CaseKey }) {
  const attempts = useLiveQuery(() => db.attempts.where("caseKey").equals(caseKey).toArray(), [caseKey]);
  if (!attempts?.length) return null;
  const exec = attempts.filter((a) => a.kind === "exec" && a.ok).map((a) => a.ms);
  const recog = attempts.filter((a) => a.kind === "recog");
  const recogOk = recog.filter((a) => a.ok).map((a) => a.ms);
  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold">Your numbers</h2>
      <table className="w-full max-w-md text-left">
        <tbody className="divide-y divide-rule">
          <tr>
            <th className="py-1 font-normal text-ink-2">Execution, median of {exec.length}</th>
            <td className="text-right font-display text-xl">{fmt(median(exec))}</td>
          </tr>
          <tr>
            <th className="py-1 font-normal text-ink-2">Best execution</th>
            <td className="text-right font-display text-xl">{fmt(exec.length ? Math.min(...exec) : null)}</td>
          </tr>
          <tr>
            <th className="py-1 font-normal text-ink-2">Recognition, median</th>
            <td className="text-right font-display text-xl">{fmt(median(recogOk))}</td>
          </tr>
          <tr>
            <th className="py-1 font-normal text-ink-2">Recognition accuracy</th>
            <td className="text-right font-display text-xl">{recog.length ? `${Math.round((100 * recogOk.length) / recog.length)}%` : "–"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
