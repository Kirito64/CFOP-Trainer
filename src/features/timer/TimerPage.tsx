import { useCallback, useEffect, useRef, useState } from "react";
import { TimerDisplay } from "../../components/TimerDisplay";
import { Button, fmt, Kbd } from "../../components/ui";
import { getSet } from "../../data/algsets";
import type { Penalty, Solve } from "../../db/db";
import { saveSetting, useSettings } from "../../db/settings";
import {
  addSolve,
  createSession,
  deleteSolve,
  ensureSession,
  PHASE_NAMES,
  phaseDurations,
  resultOf,
  sessionStats,
  setPenalty,
  updateSolve,
  useSessions,
  useSolves,
} from "../../db/solves";
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
    if (!settings.inspection) return;
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
  }, [settings.inspection, inspecting, timer]);

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
          <SessionPicker sessions={sessions} value={sessionId} onChange={setSessionId} />
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

        {!running && !inspecting && last && <LastSolve solve={last} askCases={settings.askLastLayerCases} />}

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
        {stats && <StatsPanel stats={stats} solves={solves!} />}
      </aside>
    </div>
  );
}

function SessionPicker({ sessions, value, onChange }: { sessions?: { id: string; name: string }[]; value?: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="session" className="text-sm text-ink-2">
        Session
      </label>
      <select id="session" value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-rule bg-panel px-2 py-1">
        {sessions?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Button
        variant="quiet"
        className="text-sm"
        onClick={async () => {
          const name = prompt("Name the new session", new Date().toLocaleDateString());
          if (name) onChange(await createSession(name));
        }}
      >
        New session
      </Button>
    </div>
  );
}

const PLL_IDS = getSet("PLL").cases.map((c) => c.id);

function LastSolve({ solve, askCases }: { solve: Solve; askCases: boolean }) {
  const phases = phaseDurations(solve);
  return (
    <div className="mt-6 flex w-full max-w-xl flex-col items-center gap-4">
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

function StatsPanel({ stats, solves }: { stats: ReturnType<typeof sessionStats>; solves: Solve[] }) {
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
        {stats.count} solves, mean {fmt(stats.mean)}
      </p>

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
                <span className="font-display text-lg">{s.penalty === "DNF" ? "DNF" : fmt(resultOf(s)) + (s.penalty === 2 ? "+" : "")}</span>
              </li>
            ))}
        </ol>
      </div>
    </div>
  );
}
