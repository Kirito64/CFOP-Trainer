import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { TimerDisplay } from "../../components/TimerDisplay";
import { Button, fmt, Kbd } from "../../components/ui";
import { getSet } from "../../data/algsets";
import type { Penalty, SessionKind, Solve, TimerSession } from "../../db/db";
import { saveSetting, useSettings } from "../../db/settings";
import {
  addSolve,
  createSession,
  deleteSession,
  deleteSolve,
  ensureSession,
  PHASE_NAMES,
  phaseDurations,
  rememberSession,
  resultOf,
  sessionStats,
  setPenalty,
  updateSession,
  updateSolve,
  useSessions,
  useSolves,
} from "../../db/solves";
import { paceAdvice } from "../../lib/analytics";
import { randomScramble } from "../../lib/scramble333";
import { mean } from "../../lib/stats";
import { useStackmat } from "../../lib/useStackmat";
import { Sparkline } from "./Sparkline";

const INSPECTION_MS = 15000;

/** WCA penalty for when the solve started relative to inspection (A4d1, A4d2). */
const inspectionPenalty = (ms: number): Penalty => (ms >= 17000 ? "DNF" : ms >= 15000 ? 2 : 0);

export default function TimerPage() {
  const settings = useSettings();
  const sessions = useSessions();
  const [sessionId, setSessionId] = useState<string>();
  const session = sessions?.find((s) => s.id === sessionId);
  const slow = session?.kind === "slow";
  const [editing, setEditing] = useState<"new" | "edit" | null>(null);
  const solves = useSolves(sessionId);
  const [scramble, setScramble] = useState<string>();
  const nextScramble = useRef<Promise<string> | null>(null);
  const [inspectStart, setInspectStart] = useState<number | null>(null);
  const [inspectNow, setInspectNow] = useState(0);
  const [lastId, setLastId] = useState<string | null>(null);
  const pendingPenalty = useRef<Penalty>(0);

  useEffect(() => {
    void ensureSession().then((id) => setSessionId((cur) => cur ?? id));
  }, []);

  const pickSession = (id: string) => {
    setSessionId(id);
    setLastId(null);
    void rememberSession(id);
  };

  // If the session goes away (deleted here or on another device), fall back to another one.
  useEffect(() => {
    if (sessions && sessionId && !session) void ensureSession().then(pickSession);
  }, [sessions, sessionId, session]);

  const newScramble = useCallback(async () => {
    const pending = nextScramble.current ?? randomScramble();
    setScramble(await pending);
    nextScramble.current = randomScramble();
  }, []);

  useEffect(() => {
    void newScramble();
  }, [newScramble]);

  const inspecting = inspectStart != null;
  const timer = useStackmat({
    enabled: !editing,
    holdMs: settings.holdMs,
    phases: settings.phases,
    onStart: () => {
      pendingPenalty.current = inspectStart != null ? inspectionPenalty(performance.now() - inspectStart) : 0;
      setInspectStart(null);
      setLastId(null);
    },
    onStop: async (ms, splits) => {
      if (!sessionId || !scramble) return;
      const id = await addSolve({
        sessionId,
        scramble,
        ms: Math.floor(ms),
        penalty: pendingPenalty.current,
        ...(splits.length === 3 ? { splits: splits.map(Math.floor) } : {}),
      });
      setLastId(id as string);
      void newScramble();
    },
  });

  // With inspection on, the first space press starts the 15 s countdown instead of arming the timer.
  const inspectionKeyDown = useRef(false);
  useEffect(() => {
    if (!settings.inspection || editing) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code !== "Space" || e.repeat || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.type === "keydown" && !inspecting && (timer.phase === "idle" || timer.phase === "stopped")) {
        inspectionKeyDown.current = true;
        e.preventDefault();
        e.stopImmediatePropagation();
      } else if (e.type === "keyup" && inspectionKeyDown.current) {
        // Only the release of a press we intercepted starts inspection, not the release of the press that stopped the timer.
        inspectionKeyDown.current = false;
        e.preventDefault();
        e.stopImmediatePropagation();
        timer.reset();
        setInspectStart(performance.now());
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("keyup", onKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("keyup", onKey, { capture: true });
    };
  }, [settings.inspection, inspecting, timer, editing]);

  useEffect(() => {
    if (!inspecting) return;
    let raf = 0;
    const tick = () => {
      setInspectNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inspecting]);

  const inspectLeft = inspecting ? INSPECTION_MS - (inspectNow - inspectStart!) : 0;
  const last = solves?.find((s) => s.id === lastId);
  const stats = solves ? sessionStats(solves) : null;
  const running = timer.isRunning;

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
      <div className="flex min-w-0 flex-col items-center">
        <div className={`mb-2 flex w-full flex-wrap items-center justify-between gap-3 transition-opacity ${running ? "opacity-0" : ""}`}>
          <SessionPicker sessions={sessions} value={sessionId} onChange={pickSession} onNew={() => setEditing("new")} onEdit={() => setEditing("edit")} />
          <div className="flex flex-wrap gap-2 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" className="accent-[var(--steel)]" checked={settings.inspection} onChange={(e) => saveSetting("inspection", e.target.checked)} />
              Inspection
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" className="accent-[var(--steel)]" checked={settings.phases === 4} onChange={(e) => saveSetting("phases", e.target.checked ? 4 : 1)} />
              Split taps
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                className="accent-[var(--steel)]"
                checked={settings.askLastLayerCases}
                onChange={(e) => saveSetting("askLastLayerCases", e.target.checked)}
              />
              Log OLL/PLL
            </label>
          </div>
        </div>

        {editing && (
          <SessionForm
            key={editing}
            session={editing === "edit" ? session : undefined}
            solveCount={solves?.length ?? 0}
            onDone={(id) => {
              setEditing(null);
              if (id) pickSession(id);
            }}
          />
        )}

        {slow && !editing && (
          <p className={`w-full rounded-lg border border-steel/40 bg-steel-soft px-4 py-2.5 text-sm text-ink-2 transition-opacity ${running ? "opacity-0" : ""}`}>
            <strong className="font-semibold text-ink">Slow solves.</strong> Turn slowly enough that you never stop to look for the next piece. These stay out of your averages and stats.
          </p>
        )}

        <p className={`alg my-6 min-h-[2.5em] text-center text-[clamp(1.3rem,2.8vw,1.9rem)] leading-snug transition-opacity ${running || inspecting ? "opacity-0" : ""}`}>
          {scramble ?? "…"}
        </p>

        {inspecting ? (
          <div className="flex flex-col items-center select-none">
            <div
              className={`font-display text-[clamp(5rem,16vw,11rem)] leading-none font-semibold ${
                timer.phase === "ready" ? "text-ready" : timer.phase === "holding" ? "text-hold" : inspectLeft <= 3000 ? "text-warn" : "text-ink"
              }`}
            >
              {inspectLeft > 0 ? Math.ceil(inspectLeft / 1000) : inspectLeft > -2000 ? "+2" : "DNF"}
            </div>
            <p className="mt-2 text-sm text-ink-3">Inspecting. Hold space when you're ready.</p>
          </div>
        ) : (
          <TimerDisplay
            phase={timer.phase}
            ms={timer.elapsed}
            hideWhileRunning={settings.hideRunningTime}
            penalty={!running && last ? last.penalty : 0}
            padProps={timer.padProps}
          />
        )}

        {running && settings.phases === 4 && (
          <p className="mt-3 text-ink-3">
            {PHASE_NAMES[timer.splits.length]}: press any key when it's done
          </p>
        )}

        {!running && !inspecting && last && <LastSolve solve={last} askCases={settings.askLastLayerCases} slow={slow} solves={solves!} />}

        {!running && !inspecting && !last && (
          <p className="mt-6 text-center text-sm text-ink-3">
            {settings.inspection ? (
              <>
                Tap <Kbd>Space</Kbd> to start inspection, then hold it until green and release to start.
              </>
            ) : (
              <>
                Hold <Kbd>Space</Kbd> until green, release to start, any key to stop.
              </>
            )}{" "}
            Scramble with white on top, green in front.
          </p>
        )}
      </div>

      <aside className={`transition-opacity ${running ? "opacity-20" : ""}`}>
        {stats && <StatsPanel stats={stats} solves={solves!} slow={slow} />}
      </aside>
    </div>
  );
}

function SessionPicker({
  sessions,
  value,
  onChange,
  onNew,
  onEdit,
}: {
  sessions?: TimerSession[];
  value?: string;
  onChange: (id: string) => void;
  onNew: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="session" className="text-sm text-ink-2">
        Session
      </label>
      <select id="session" value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[12rem] rounded-md border border-rule bg-panel px-2 py-1">
        {sessions?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.kind === "slow" ? " (slow)" : ""}
          </option>
        ))}
      </select>
      <Button variant="quiet" className="min-h-8 px-2.5 py-1" onClick={onEdit} disabled={!value}>
        Edit
      </Button>
      <Button className="min-h-8 px-3 py-1" onClick={onNew}>
        New session
      </Button>
    </div>
  );
}

const KINDS: { kind: SessionKind; title: string; about: string; name: string }[] = [
  { kind: "timed", title: "Timed solves", about: "Your normal solves. They count towards your averages and stats.", name: "" },
  {
    kind: "slow",
    title: "Slow solves",
    about: "Lookahead practice: turn slowly enough that you never stop, and log your pauses after each solve. Kept out of your averages.",
    name: "Slow solves",
  },
];

/** Create a session, or rename, retype or delete the current one. */
function SessionForm({ session, solveCount, onDone }: { session?: TimerSession; solveCount: number; onDone: (id?: string) => void }) {
  const [name, setName] = useState(session?.name ?? "");
  const [kind, setKind] = useState<SessionKind>(session?.kind ?? "timed");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fallbackName = KINDS.find((k) => k.kind === kind)!.name || new Date().toLocaleDateString();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim() || fallbackName;
    if (session) {
      await updateSession(session.id, { name: n, kind });
      onDone();
    } else onDone(await createSession(n, kind));
  };

  return (
    <form onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onDone()} className="mt-2 mb-2 w-full rounded-xl border border-rule bg-panel p-4">
      <h2 className="mb-3 font-display text-lg font-semibold">{session ? "Edit session" : "New session"}</h2>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-sm text-ink-2">What are these solves for?</legend>
        {KINDS.map((k) => (
          <label
            key={k.kind}
            className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${kind === k.kind ? "border-steel bg-steel-soft" : "border-rule hover:border-ink-3"}`}
          >
            <input type="radio" name="kind" value={k.kind} checked={kind === k.kind} onChange={() => setKind(k.kind)} className="mt-1 accent-[var(--steel)]" />
            <span>
              <span className="block font-semibold">{k.title}</span>
              <span className="block text-sm text-ink-2">{k.about}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="mt-4 flex flex-col gap-1 text-sm text-ink-2">
        Name
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={fallbackName}
          maxLength={40}
          className="max-w-xs rounded-md border border-rule bg-mat px-3 py-2 text-base text-ink"
        />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary">
          {session ? "Save" : "Create session"}
        </Button>
        <Button variant="quiet" onClick={() => onDone()}>
          Cancel
        </Button>
        {session &&
          (confirmDelete ? (
            <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
              Delete “{session.name}”{solveCount ? ` and its ${solveCount} ${solveCount === 1 ? "solve" : "solves"}` : ""}?
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteSession(session.id);
                  onDone();
                }}
              >
                Delete
              </Button>
              <Button variant="quiet" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
            </span>
          ) : (
            <Button variant="danger" className="ml-auto" onClick={() => setConfirmDelete(true)}>
              Delete session
            </Button>
          ))}
      </div>
    </form>
  );
}

const PLL_IDS = getSet("PLL").cases.map((c) => c.id);

function LastSolve({ solve, askCases, slow, solves }: { solve: Solve; askCases: boolean; slow: boolean; solves: Solve[] }) {
  const phases = phaseDurations(solve);
  return (
    <div className="mt-6 flex w-full max-w-xl flex-col items-center gap-4">
      {slow && <Pauses solve={solve} solves={solves} />}
      <div className="flex gap-2">
        {([0, 2, "DNF"] as Penalty[]).map((p) => (
          <Button key={String(p)} variant={solve.penalty === p ? "primary" : "outline"} onClick={() => setPenalty(solve.id, p)}>
            {p === 0 ? "OK" : p === 2 ? "+2" : "DNF"}
          </Button>
        ))}
        <Button variant="danger" onClick={() => deleteSolve(solve.id)}>
          Delete
        </Button>
      </div>
      {phases && (
        <table className="text-center">
          <thead>
            <tr className="text-sm text-ink-3">
              {PHASE_NAMES.map((n) => (
                <th key={n} className="px-3 font-normal">
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="font-display text-2xl">
              {phases.map((d, i) => (
                <td key={i} className="px-3">
                  {fmt(d)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
      {askCases && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            OLL
            <input
              inputMode="numeric"
              defaultValue={solve.oll?.replace("OLL ", "") ?? ""}
              onBlur={(e) => updateSolve(solve.id, { oll: e.target.value ? `OLL ${Number(e.target.value)}` : undefined })}
              placeholder="1–57, 0 = skip"
              className="w-28 rounded-md border border-rule bg-panel px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2">
            PLL
            <select
              defaultValue={solve.pll ?? ""}
              onChange={(e) => updateSolve(solve.id, { pll: e.target.value || undefined })}
              className="rounded-md border border-rule bg-panel px-2 py-1"
            >
              <option value="">–</option>
              <option value="skip">Skip</option>
              {PLL_IDS.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

const PAUSE_OPTIONS = [0, 1, 2, 3, 4, 5];
const ADVICE = {
  slower: "You stopped. Slow down a little on the next one.",
  hold: "Smooth. Keep this pace.",
  faster: "Three smooth solves in a row. Try a touch faster.",
};

/** After a slow solve: how many times you stopped to look. Number keys 0–5 work too. */
function Pauses({ solve, solves }: { solve: Solve; solves: Solve[] }) {
  const set = (pauses: number) => updateSolve(solve.id, { pauses });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      // Only digit keys: Number(" ") is 0, so Space for the next solve would log this one as smooth.
      if (/^[0-5]$/.test(e.key)) void set(Number(e.key));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const advice = solve.pauses != null ? paceAdvice(solves.map((s) => s.pauses)) : null;
  return (
    <div className="flex flex-col items-center gap-2">
      <p id="pauses-label" className="text-sm text-ink-2">
        How many times did you stop to look for the next piece? <span className="text-ink-3">Keys 0–5</span>
      </p>
      <div role="radiogroup" aria-labelledby="pauses-label" className="flex gap-1.5">
        {PAUSE_OPTIONS.map((n) => (
          <Button
            key={n}
            role="radio"
            aria-checked={solve.pauses === n}
            variant={solve.pauses === n ? "primary" : "outline"}
            className="min-w-11 px-3"
            onClick={() => set(n)}
          >
            {n === 5 ? "5+" : n}
          </Button>
        ))}
      </div>
      {advice && <p className={`text-sm font-semibold ${advice === "slower" ? "text-warn" : "text-ready"}`}>{ADVICE[advice]}</p>}
    </div>
  );
}

function StatsPanel({ stats, solves, slow }: { stats: ReturnType<typeof sessionStats>; solves: Solve[]; slow: boolean }) {
  const recentPhases = solves.slice(-12).map(phaseDurations).filter((p): p is number[] => !!p);
  return (
    <div className="flex flex-col gap-6">
      <table className="w-full">
        <thead>
          <tr className="text-sm text-ink-3">
            <th className="text-left font-normal" />
            <th className="text-right font-normal">Current</th>
            <th className="text-right font-normal">Best</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule font-display text-xl">
          <tr>
            <th className="py-1 text-left font-sans text-base font-normal text-ink-2">Single</th>
            <td className="text-right">{fmt(stats.current, stats.current === Infinity)}</td>
            <td className="text-right">{fmt(stats.best)}</td>
          </tr>
          <tr>
            <th className="py-1 text-left font-sans text-base font-normal text-ink-2">Mo3</th>
            <td className="text-right">{fmt(stats.mo3, stats.mo3 === Infinity)}</td>
            <td />
          </tr>
          {stats.averages.map((a) => (
            <tr key={a.n}>
              <th className="py-1 text-left font-sans text-base font-normal text-ink-2">Ao{a.n}</th>
              <td className="text-right">{fmt(a.current, a.current === Infinity)}</td>
              <td className="text-right">{fmt(a.best, a.best === Infinity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="-mt-3 text-sm text-ink-3">
        {stats.count} {stats.count === 1 ? "solve" : "solves"}, mean {fmt(stats.mean)}
      </p>

      {slow && <SlowSummary solves={solves} />}

      {solves.length >= 5 && <Sparkline values={solves.map(resultOf)} window={5} />}

      {recentPhases.length > 0 && (
        <div>
          <h3 className="mb-1 font-display text-lg font-semibold">Splits, mean of last {recentPhases.length}</h3>
          <table className="w-full">
            <tbody className="divide-y divide-rule">
              {PHASE_NAMES.map((n, i) => (
                <tr key={n}>
                  <th className="py-1 text-left font-normal text-ink-2">{n}</th>
                  <td className="text-right font-display text-xl">{fmt(mean(recentPhases.map((p) => p[i])))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h3 className="mb-1 font-display text-lg font-semibold">Times</h3>
        <ol className="max-h-80 overflow-y-auto">
          {solves
            .map((s, i) => ({ s, i }))
            .reverse()
            .map(({ s, i }) => (
              <li key={s.id} className="flex items-baseline justify-between border-b border-rule py-1" title={s.scramble}>
                <span className="text-sm text-ink-3">{i + 1}</span>
                {slow && s.pauses != null && <span className="ml-auto pr-3 text-sm text-ink-3">{s.pauses ? `${s.pauses === 5 ? "5+" : s.pauses} paused` : "smooth"}</span>}
                <span className="font-display text-lg">{s.penalty === "DNF" ? "DNF" : fmt(resultOf(s)) + (s.penalty === 2 ? "+" : "")}</span>
              </li>
            ))}
        </ol>
      </div>
    </div>
  );
}

function SlowSummary({ solves }: { solves: Solve[] }) {
  const recent = solves.map((s) => s.pauses).filter((p): p is number => p != null).slice(-12);
  if (!recent.length) return <p className="text-sm text-ink-3">Log your pauses after each solve to see how smooth this session is.</p>;
  const smooth = recent.filter((p) => p === 0).length;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-sm text-ink-2">Smooth solves</p>
        <p className="font-display text-2xl">
          {smooth}
          <span className="text-base text-ink-3"> of {recent.length}</span>
        </p>
      </div>
      <div>
        <p className="text-sm text-ink-2">Pauses per solve</p>
        <p className="font-display text-2xl">{mean(recent)!.toFixed(1)}</p>
      </div>
      <p className="col-span-2 -mt-1 text-sm text-ink-3">Your last {recent.length} with pauses logged. A smooth solve has none.</p>
    </div>
  );
}
