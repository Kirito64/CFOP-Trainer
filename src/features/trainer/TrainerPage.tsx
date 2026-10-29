import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Button, Empty, PageHeader, Tabs } from "../../components/ui";
import { ALG_SETS, allCaseKeys, getCase, groups, SET_IDS } from "../../data/algsets";
import { type AlgSetId, type CaseKey, caseKey } from "../../data/types";
import { db, type LearnStatus } from "../../db/db";
import { setStatus } from "../../db/progress";
import { useSettings } from "../../db/settings";
import { dailyQueue } from "../../srs/srs";
import { type Item, shuffle } from "./queue";
import { TrainerRun } from "./TrainerRun";

type Mode = "review" | "drill";
type Filter = "all" | LearnStatus | "groups";

export interface RunConfig {
  mode: Mode;
  items: Item[];
  /** Keys introduced for the first time this session (shown with the alg first). */
  fresh: Set<CaseKey>;
}

export default function TrainerPage() {
  // Other pages can hand over a list of cases to drill straight away (e.g. "Drill these" in Stats).
  const preset = (useLocation().state as { drillKeys?: CaseKey[] } | null)?.drillKeys;
  const [run, setRun] = useState<RunConfig | null>(() =>
    preset?.length ? { mode: "drill", items: preset.map((key) => ({ key, mirror: false })), fresh: new Set() } : null,
  );
  if (run) return <TrainerRun config={run} onExit={() => setRun(null)} />;
  return <TrainerSetup onStart={setRun} />;
}

function TrainerSetup({ onStart }: { onStart: (c: RunConfig) => void }) {
  const [mode, setMode] = useState<Mode>("review");
  return (
    <>
      <PageHeader title="Train algs">
        Scramble your cube into each case, solve it with the timer, and the app schedules the next review from how it went. Hold yellow on top
        and green in front when you scramble.
      </PageHeader>
      <div className="mb-8">
        <Tabs<Mode>
          label="Training mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "review", label: "Daily review" },
            { value: "drill", label: "Drill a set" },
          ]}
        />
      </div>
      {mode === "review" ? <ReviewSetup onStart={onStart} /> : <DrillSetup onStart={onStart} />}
    </>
  );
}

const itemsFor = (keys: CaseKey[], slots: ("FR" | "FL")[]): Item[] =>
  keys.map((key) => ({ key, mirror: key.startsWith("F2L:") && slots[Math.floor(Math.random() * slots.length)] === "FL" }));

function ReviewSetup({ onStart }: { onStart: (c: RunConfig) => void }) {
  const settings = useSettings();
  const [sets, setSets] = useState<AlgSetId[]>(SET_IDS);
  const queue = useLiveQuery(() => dailyQueue({ sets, newPerDay: settings.newPerDay }), [sets, settings.newPerDay]);
  const slots = settings.f2lSlots.filter((s): s is "FR" | "FL" => s === "FR" || s === "FL");
  const total = queue ? queue.due.length + queue.unscheduled.length + queue.fresh.length : 0;

  const start = () => {
    if (!queue) return;
    // New cases go first so they're learned with fresh attention, the rest interleaved.
    const items = [...itemsFor(queue.fresh, slots), ...shuffle(itemsFor([...queue.due, ...queue.unscheduled], slots))];
    onStart({ mode: "review", items, fresh: new Set(queue.fresh) });
  };

  return (
    <div className="max-w-3xl">
      <fieldset className="mb-6">
        <legend className="mb-2 font-medium">Sets to include</legend>
        <div className="flex flex-wrap gap-2">
          {ALG_SETS.map((s) => (
            <label key={s.id} className="flex items-center gap-2 rounded-md border border-rule bg-panel px-3 py-1.5">
              <input
                type="checkbox"
                className="accent-[var(--steel)]"
                checked={sets.includes(s.id)}
                onChange={(e) => setSets(e.target.checked ? [...sets, s.id] : sets.filter((x) => x !== s.id))}
              />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>

      {queue && (
        <table className="mb-6 w-full max-w-md">
          <tbody className="divide-y divide-rule">
            <QueueRow label="Due for review" n={queue.due.length} />
            <QueueRow label="Known, not yet scheduled" n={queue.unscheduled.length} />
            <QueueRow label={`New today (limit ${settings.newPerDay})`} n={queue.fresh.length} />
          </tbody>
        </table>
      )}

      {total > 0 ? (
        <Button variant="primary" onClick={start}>
          Start review of {total} {total === 1 ? "case" : "cases"}
        </Button>
      ) : (
        <Empty>
          <p className="mb-3">Nothing to review right now.</p>
          <p className="mb-4 text-sm">
            Mark the cases you already know as Known in the <Link to="/library/PLL" className="underline">Library</Link>, and the ones
            you want to learn as Learning. Or start the next few OLLs now:
          </p>
          <StartNextButton set="OLL" n={settings.newPerDay} />
        </Empty>
      )}
    </div>
  );
}

function QueueRow({ label, n }: { label: string; n: number }) {
  return (
    <tr>
      <th className="py-1.5 text-left font-normal text-ink-2">{label}</th>
      <td className="text-right font-display text-2xl font-semibold">{n}</td>
    </tr>
  );
}

/** Moves the next n untouched cases of a set (in library order) to Learning. */
export function StartNextButton({ set, n }: { set: AlgSetId; n: number }) {
  const progress = useLiveQuery(() => db.progress.where("id").startsWith(`${set}:`).toArray(), [set]);
  const touched = new Set(progress?.filter((p) => p.status !== "new").map((p) => p.id));
  const next = allCaseKeys(set).filter((k) => !touched.has(k)).slice(0, n);
  if (!next.length) return null;
  return (
    <Button variant="primary" onClick={() => Promise.all(next.map((k) => setStatus(k, "learning")))}>
      Learn {next.map((k) => getCase(k)!.def.id).join(", ")}
    </Button>
  );
}

function DrillSetup({ onStart }: { onStart: (c: RunConfig) => void }) {
  const [set, setSet] = useState<AlgSetId>("OLL");
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [slots, setSlots] = useState<("FR" | "FL")[]>(["FR", "FL"]);
  const progress = useLiveQuery(() => db.progress.where("id").startsWith(`${set}:`).toArray(), [set]);

  const keys = useMemo(() => {
    const status = new Map(progress?.map((p) => [p.id, p.status]));
    return groups(set).flatMap(({ group, cases }) =>
      cases
        .map((c) => caseKey(set, c.id))
        .filter((k) => {
          if (filter === "all") return true;
          if (filter === "groups") return picked.includes(group);
          return (status.get(k) ?? "new") === filter;
        }),
    );
  }, [set, filter, picked, progress]);

  const effectiveSlots = slots.length ? slots : (["FR"] as ("FR" | "FL")[]);

  return (
    <div className="max-w-4xl">
      <div className="mb-5">
        <Tabs<AlgSetId> label="Set" value={set} onChange={(s) => (setSet(s), setPicked([]))} options={ALG_SETS.map((s) => ({ value: s.id, label: s.name }))} />
      </div>
      <fieldset className="mb-5">
        <legend className="mb-2 font-medium">Which cases</legend>
        <Tabs<Filter>
          label="Case filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "learning", label: "Learning" },
            { value: "known", label: "Known" },
            { value: "new", label: "Not learned" },
            { value: "groups", label: "Pick groups" },
          ]}
        />
      </fieldset>
      {filter === "groups" && (
        <div className="mb-5 flex flex-wrap gap-2">
          {groups(set).map(({ group, cases }) => (
            <label key={group} className="flex items-center gap-2 rounded-md border border-rule bg-panel px-3 py-1.5 text-[0.95rem]">
              <input
                type="checkbox"
                className="accent-[var(--steel)]"
                checked={picked.includes(group)}
                onChange={(e) => setPicked(e.target.checked ? [...picked, group] : picked.filter((g) => g !== group))}
              />
              {group} <span className="text-ink-3">{cases.length}</span>
            </label>
          ))}
        </div>
      )}
      {set === "F2L" && (
        <fieldset className="mb-5">
          <legend className="mb-2 font-medium">Slots</legend>
          <div className="flex gap-2">
            {(["FR", "FL"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 rounded-md border border-rule bg-panel px-3 py-1.5">
                <input
                  type="checkbox"
                  className="accent-[var(--steel)]"
                  checked={slots.includes(s)}
                  onChange={(e) => setSlots(e.target.checked ? [...slots, s] : slots.filter((x) => x !== s))}
                />
                {s === "FR" ? "Front right" : "Front left (mirrored)"}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Button
        variant="primary"
        disabled={!keys.length}
        onClick={() =>
          onStart({
            mode: "drill",
            items: keys.flatMap((key) => (set === "F2L" ? effectiveSlots.map((s) => ({ key, mirror: s === "FL" })) : [{ key, mirror: false }])),
            fresh: new Set(),
          })
        }
      >
        Drill {keys.length} {keys.length === 1 ? "case" : "cases"}
      </Button>
      <p className="mt-3 text-sm text-ink-3">Drilling picks slow and missed cases more often. It runs until you stop.</p>
    </div>
  );
}
