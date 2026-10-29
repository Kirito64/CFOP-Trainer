import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { CaseView, type Mask } from "../../components/CubeView";
import { Button, Kbd, PageHeader, Tabs, fmt } from "../../components/ui";
import { applyAlg, at, caseState, type CubeState, invertAlg, normalise } from "../../cube/cube";
import { type Auf, AUF_LABELS, recolour, validPreAufs } from "../../cube/recolour";
import { getSet } from "../../data/algsets";
import { type CaseDef, type CaseKey, caseKey } from "../../data/types";
import { db, newId, now } from "../../db/db";
import { median } from "../../lib/stats";
import { shuffle } from "../trainer/queue";

type Mode = "OLL" | "PLL" | "PLL2";

const MODES: { value: Mode; label: string }[] = [
  { value: "PLL2", label: "PLL from two sides" },
  { value: "PLL", label: "PLL from the top" },
  { value: "OLL", label: "OLL" },
];

interface Question {
  def: CaseDef;
  key: CaseKey;
  state: CubeState;
  /** Valid pre-AUFs, when the mode asks for one. */
  aufs?: Auf[];
  /** OLL multiple choice. */
  options?: CaseDef[];
  shownAt: number;
}

interface Answer {
  q: Question;
  pickedId: string;
  ok: boolean;
  ms: number;
}

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

const PLL = getSet("PLL").cases;
const OLL = getSet("OLL").cases;
const PLL_NOISE = PLL.map((c) => c.algs[0]);

// How many edges are oriented in each OLL, so distractors can share it.
const UP_EDGES = [at("U", 0, 1), at("U", 1, 0), at("U", 1, 2), at("U", 2, 1)];
const OLL_EDGES = new Map(OLL.map((c) => [c.id, UP_EDGES.filter((i) => caseState(c.algs[0])[i] === "U").length]));

/**
 * The case plus look-alikes: the cases you're practising together first, then the same shape group,
 * then cases with the same number of oriented edges.
 */
function similarOll(def: CaseDef, n: number, prefer: CaseDef[]): CaseDef[] {
  const others = OLL.filter((c) => c.id !== def.id);
  const same = shuffle(others.filter((c) => c.group === def.group));
  const near = shuffle(others.filter((c) => c.group !== def.group && OLL_EDGES.get(c.id) === OLL_EDGES.get(def.id)));
  const together = shuffle(prefer.filter((c) => c.id !== def.id));
  return shuffle([def, ...new Set([...together, ...same, ...near])].slice(0, n));
}

function makeQuestion(mode: Mode, withAuf: boolean, pool: CaseDef[]): Question {
  const focused = pool.length < (mode === "OLL" ? OLL : PLL).length;
  const def = pick(pool);
  const alg = def.algs[0];
  const postAuf = Math.floor(Math.random() * 4);
  const preAuf = Math.floor(Math.random() * 4);
  if (mode === "OLL") {
    // Random permutation underneath so only orientation identifies the case.
    const before = normalise(applyAlg(caseState(""), invertAlg(pick(PLL_NOISE))));
    return { def, key: caseKey("OLL", def.id), state: caseState(alg, { preAuf, postAuf, before }), options: similarOll(def, 6, focused ? pool : []), shownAt: performance.now() };
  }
  const state = recolour(caseState(alg, { preAuf, postAuf }), Math.floor(Math.random() * 4));
  return { def, key: caseKey("PLL", def.id), state, aufs: withAuf ? validPreAufs(state, alg) : undefined, shownAt: performance.now() };
}

const PLL_NAMES = PLL.map((c) => c.id.toLowerCase());

export default function RecognitionPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const requestedMode = params.get("mode");
  const mode = MODES.find((m) => m.value === requestedMode)?.value ?? "PLL2";
  const setMode = (next: Mode) => setParams((current) => { current.set("mode", next); return current; }, { replace: true });
  const [withAuf, setWithAuf] = useState(false);
  const [running, setRunning] = useState(false);
  // Cases sent from Stats to practise telling apart.
  const [focus, setFocus] = useState(() => ((location.state as { focus?: CaseKey[] } | null)?.focus ?? []).filter((k) => k.startsWith(mode === "OLL" ? "OLL:" : "PLL:")));
  return (
    <>
      <PageHeader title="Recognise">
        Name the case as fast as you can, no cube needed. Recognition time is measured from when the case appears to your answer, so it's the
        number that hides inside your solve times.
      </PageHeader>
      {running ? (
        <RecognitionRun mode={mode} withAuf={withAuf} focus={focus} onExit={() => setRunning(false)} />
      ) : (
        <div className="max-w-2xl">
          <div className="mb-5">
            <Tabs
              label="What to recognise"
              value={mode}
              onChange={(m) => {
                setFocus([]);
                setMode(m);
              }}
              options={MODES}
            />
          </div>
          {focus.length > 0 && (
            <div className="mb-6 rounded-lg border border-steel p-4">
              <p className="font-semibold">Only the cases you mix up</p>
              <p className="mt-1 text-ink-2">{focus.map((k) => k.split(":")[1]).join(", ")}</p>
              <Button variant="quiet" className="mt-1 -ml-4 text-sm" onClick={() => setFocus([])}>
                Practise every case instead
              </Button>
            </div>
          )}
          {mode !== "OLL" && (
            <label className="mb-6 flex items-center gap-2">
              <input type="checkbox" className="accent-[var(--steel)]" checked={withAuf} onChange={(e) => setWithAuf(e.target.checked)} />
              Also name the U turn before the alg (AUF prediction)
            </label>
          )}
          <p className="mb-6 text-ink-2">
            {mode === "OLL"
              ? "Pick the case from six that look alike. Number keys 1 to 6 answer."
              : "Type the case name: t, y, ja, ga… Single-letter names answer straight away. Each case appears at a random angle and colour."}
          </p>
          <Button variant="primary" onClick={() => setRunning(true)}>
            Start
          </Button>
        </div>
      )}
    </>
  );
}

function RecognitionRun({ mode, withAuf, focus, onExit }: { mode: Mode; withAuf: boolean; focus: CaseKey[]; onExit: () => void }) {
  const [pool] = useState(() => {
    const all = mode === "OLL" ? OLL : PLL;
    const only = all.filter((c) => focus.includes(caseKey(mode === "OLL" ? "OLL" : "PLL", c.id)));
    return only.length ? only : all;
  });
  const [q, setQ] = useState(() => makeQuestion(mode, withAuf, pool));
  const [typed, setTyped] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [aufStage, setAufStage] = useState<{ caseOk: boolean; ms: number; pickedId: string } | null>(null);
  const [log, setLog] = useState<Answer[]>([]);

  const finish = useCallback(
    async (pickedId: string, caseOk: boolean, ms: number, label = pickedId) => {
      const a: Answer = { q, pickedId: label, ok: caseOk, ms };
      setAnswer(a);
      setLog((l) => [...l, a]);
      await db.attempts.add({
        id: newId(),
        caseKey: q.key,
        kind: "recog",
        ms: Math.round(ms),
        ok: caseOk,
        ...(caseOk ? {} : { picked: pickedId }),
        at: now(),
        updatedAt: now(),
      });
    },
    [q],
  );

  const submitCase = useCallback(
    (typed: string) => {
      const ms = performance.now() - q.shownAt;
      const id = (mode === "OLL" ? OLL : PLL).find((c) => c.id.toLowerCase() === typed.toLowerCase())?.id ?? typed;
      const ok = id === q.def.id;
      if (q.aufs && ok) setAufStage({ caseOk: ok, ms, pickedId: id });
      else void finish(id, ok, ms);
    },
    [q, mode, finish],
  );

  const submitAuf = useCallback(
    (auf: Auf) => {
      if (!aufStage || !q.aufs) return;
      const ok = q.aufs.includes(auf);
      void finish(aufStage.pickedId, ok, performance.now() - q.shownAt, aufStage.pickedId + (ok ? "" : ` (AUF ${AUF_LABELS[auf]})`));
      setAufStage(null);
    },
    [aufStage, q, finish],
  );

  const next = useCallback(() => {
    setAnswer(null);
    setTyped("");
    setQ(makeQuestion(mode, withAuf, pool));
  }, [mode, withAuf, pool]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") return onExit();
      if (answer) {
        if (e.code === "Space" || e.key === "Enter") {
          e.preventDefault();
          next();
        }
        return;
      }
      if (aufStage) {
        const k = ["1", "2", "3", "4"].indexOf(e.key);
        if (k >= 0) submitAuf((["", "U", "U2", "U'"] as Auf[])[k]);
        return;
      }
      if (mode === "OLL") {
        const k = Number(e.key);
        if (k >= 1 && k <= (q.options?.length ?? 0)) submitCase(q.options![k - 1].id);
        return;
      }
      if (e.key === "Backspace") return setTyped((t) => t.slice(0, -1));
      if (!/^[a-z]$/i.test(e.key)) return;
      const t = typed + e.key.toLowerCase();
      const matches = PLL_NAMES.filter((n) => n.startsWith(t));
      if (matches.length === 1 && matches[0] === t) submitCase(t);
      else if (matches.length) setTyped(t);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, aufStage, mode, q, typed, next, onExit, submitCase, submitAuf]);

  const mask: Mask = mode === "OLL" ? "orientation" : "full";
  const recent = log.slice(-20);
  const okTimes = recent.filter((a) => a.ok).map((a) => a.ms);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
      <div className="flex flex-col items-center">
        <CaseView view={mode === "PLL2" ? "iso" : "top"} mask={mask} state={q.state} size={mode === "PLL2" ? 280 : 250} />

        {!answer && !aufStage && mode !== "OLL" && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="h-12 font-display text-4xl font-semibold uppercase">{typed || <span className="text-ink-3 normal-case">type the name</span>}</div>
            <div className="flex max-w-xl flex-wrap justify-center gap-1.5">
              {PLL.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => submitCase(c.id)}
                  className="w-11 rounded-md border border-rule bg-panel py-1 font-display text-lg font-semibold hover:border-ink-3"
                >
                  {c.id}
                </button>
              ))}
            </div>
          </div>
        )}

        {!answer && !aufStage && mode === "OLL" && (
          <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {q.options!.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => submitCase(c.id)}
                  className="flex w-full flex-col items-center gap-1 rounded-lg border border-rule bg-panel p-2 hover:border-ink-3"
                >
                  <CaseView view="top" mask="orientation" state={caseState(c.algs[0])} size={72} />
                  <span className="text-sm">
                    <Kbd>{i + 1}</Kbd> {c.id.replace("OLL ", "")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {aufStage && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-lg">Right, it's {q.def.id}. Which U turn before your alg?</p>
            <div className="flex gap-2">
              {(["", "U", "U2", "U'"] as Auf[]).map((a, i) => (
                <Button key={a} onClick={() => submitAuf(a)}>
                  <Kbd>{i + 1}</Kbd> {AUF_LABELS[a]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {answer && (
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <p className={`font-display text-3xl font-semibold ${answer.ok ? "text-ready" : "text-hold"}`}>
              {answer.ok ? `${fmt(answer.ms)} s` : `It was ${answer.q.def.id}`}
            </p>
            {!answer.ok && <p className="text-ink-2">You answered {answer.pickedId}.</p>}
            {answer.q.aufs && answer.ok && <p className="text-ink-2">Pre-AUF: {answer.q.aufs.map((a) => AUF_LABELS[a]).join(" or ")}</p>}
            {!answer.ok && answer.q.def.recognition && <p className="max-w-[60ch] text-sm text-ink-2">{answer.q.def.recognition}</p>}
            <Link className="text-sm text-steel underline" to={`/library/${answer.q.key.split(":")[0]}/${encodeURIComponent(answer.q.def.id)}`}>
              Open {answer.q.def.id} in the library
            </Link>
            <Button variant="primary" onClick={next} className="mt-2">
              Next <Kbd>Space</Kbd>
            </Button>
          </div>
        )}
      </div>

      <aside>
        <h2 className="mb-2 font-display text-xl font-semibold">Last {recent.length}</h2>
        <table className="mb-4 w-full">
          <tbody className="divide-y divide-rule">
            <tr>
              <th className="py-1 text-left font-normal text-ink-2">Accuracy</th>
              <td className="text-right font-display text-xl">{recent.length ? `${Math.round((100 * okTimes.length) / recent.length)}%` : "–"}</td>
            </tr>
            <tr>
              <th className="py-1 text-left font-normal text-ink-2">Median time</th>
              <td className="text-right font-display text-xl">{fmt(median(okTimes))}</td>
            </tr>
          </tbody>
        </table>
        <ol className="flex flex-wrap gap-1">
          {recent.map((a, i) => (
            <li key={i} className={`rounded px-1.5 font-display text-sm ${a.ok ? "bg-steel-soft" : "bg-hold text-panel"}`} title={a.q.def.id}>
              {a.q.def.id.replace("OLL ", "")}
            </li>
          ))}
        </ol>
        <Button variant="quiet" className="mt-6" onClick={onExit}>
          Stop <Kbd>Esc</Kbd>
        </Button>
      </aside>
    </div>
  );
}
