import { useLiveQuery } from "dexie-react-hooks";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button, fmt, PageHeader, Section } from "../../components/ui";
import { allCaseKeys, SET_IDS } from "../../data/algsets";
import { db } from "../../db/db";
import { setStatus } from "../../db/progress";
import { useSettings } from "../../db/settings";
import { PHASE_NAMES, phaseDurations, resultOf } from "../../db/solves";
import { averageOf, bestAverage, mean, median } from "../../lib/stats";
import { dailyQueue } from "../../srs/srs";
import { StartNextButton } from "../trainer/TrainerPage";

const SUB10_SPLITS = [1300, 5300, 1600, 1600];

interface Focus {
  title: string;
  /** Shown when the focus was picked from the user's own splits. */
  why: string;
  /** Shown when it came from the weekly rotation. */
  about: string;
  to: string;
  cue: string;
}

const FOCUS: Record<string, Focus> = {
  Cross: { title: "Cross trainer", why: "Your cross is the furthest behind sub-10 pace.", about: "Planning the whole cross in inspection takes a second or more off most 13-second solves.", to: "/drills/cross", cue: "Plan the full cross before you start the timer." },
  F2L: { title: "Metronome solves", why: "F2L is where the most time goes; pauses between pairs are the usual culprit.", about: "Most of a solve is F2L, and pauses between pairs are where lookahead time hides.", to: "/drills/metronome", cue: "Don't stop turning between pairs." },
  OLL: { title: "OLL recognition and review", why: "Your OLL stage is slow: recognition and unknown cases add up.", about: "Finishing full OLL and recognising it instantly removes the two-look fallbacks.", to: "/recognise", cue: "Recognise the OLL before the last pair is in." },
  PLL: { title: "PLL time attack", why: "PLL is slower than it should be for a sub-10 average.", about: "Fast, pause-free PLL execution is one of the cheapest seconds to win.", to: "/drills/pll-attack", cue: "Recognise PLL from two sides and pre-AUF without looking around." },
};
// Without split data, rotate the focus through the week.
const ROTATION = ["Cross", "F2L", "OLL", "F2L", "Cross", "PLL", "F2L"];

export default function TodayPage() {
  const settings = useSettings();
  const data = useLiveQuery(async () => {
    const [solves, progress, attempts, drills, queue] = await Promise.all([
      db.solves.orderBy("at").toArray(),
      db.progress.toArray(),
      db.attempts.filter((a) => a.kind === "recog" && !a.deleted).toArray(),
      db.drills.toArray(),
      dailyQueue({ sets: SET_IDS, newPerDay: settings.newPerDay }),
    ]);
    return { solves: solves.filter((s) => !s.deleted), progress: progress.filter((p) => !p.deleted), recog: attempts, drills, queue };
  }, [settings.newPerDay]);

  if (!data) return null;
  const { solves, progress, recog, drills, queue } = data;
  const results = solves.map(resultOf);
  const ao12 = averageOf(results, 12);
  const known = (set: string) => progress.filter((p) => p.id.startsWith(`${set}:`) && p.status === "known").length;
  const nothingSetUp = progress.length === 0;

  const phases = solves.slice(-50).map(phaseDurations).filter((p): p is number[] => !!p);
  const gaps = phases.length >= 5 ? PHASE_NAMES.map((n, i) => ({ n, gap: mean(phases.map((p) => p[i]))! - SUB10_SPLITS[i] })) : null;
  const focusKey = gaps ? gaps.reduce((a, b) => (b.gap > a.gap ? b : a)).n : ROTATION[new Date().getDay()];
  const focus = FOCUS[focusKey];
  const reviewCount = queue.due.length + queue.unscheduled.length + queue.fresh.length;

  const pllRecog = median(recog.filter((a) => a.caseKey.startsWith("PLL:") && a.ok).slice(-50).map((a) => a.ms));
  const pllAttack = drills.filter((d) => d.drill === "pll-attack" && !d.deleted).map((d) => d.score);
  const crossLevel = Math.max(0, ...drills.filter((d) => d.drill === "cross").map((d) => (d.detail?.outcome === "optimal" ? (d.detail.level as number) : 0)));
  const bestAo12 = bestAverage(results, 12);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Today">
        {ao12 != null
          ? `Your current ao12 is ${fmt(ao12, ao12 === Infinity)}. Goal: sub-${settings.goalMs / 1000}.`
          : `Goal: sub-${settings.goalMs / 1000}. Do an ao12 in the timer so the plan can see where you are.`}
      </PageHeader>

      {nothingSetUp && (
        <Section title="Start by telling it what you know">
          <p className="mb-4 max-w-[65ch] text-ink-2">
            Cases you already know go into review instead of being taught from scratch. You can change any case later in the library.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => Promise.all(allCaseKeys("PLL").map((k) => setStatus(k, "known")))}>
              I know all 21 PLLs
            </Button>
            <Link to="/library/OLL" className="inline-flex items-center rounded-md border border-rule bg-panel px-3.5 py-1.5 font-medium hover:border-ink-3">
              Mark the OLLs I know
            </Link>
          </div>
        </Section>
      )}

      <Section title="Today's session">
        <ol className="flex flex-col divide-y divide-rule">
          <Step n={1} title="Warm up" minutes="5 min" to="/recognise" action="Recognise PLLs">
            A few minutes of two-sided PLL recognition gets your eyes going before you turn.
          </Step>
          <Step n={2} title="Alg review" minutes="10 min" to="/train" action={reviewCount ? `Review ${reviewCount} cases` : "Open the trainer"}>
            {reviewCount
              ? `${queue.due.length} due, ${queue.unscheduled.length} known cases to check, ${queue.fresh.length} new.`
              : known("OLL") < 57
                ? "Nothing due. Pick up a few more OLLs:"
                : "Nothing due today."}
            {!reviewCount && known("OLL") < 57 && (
              <div className="mt-2">
                <StartNextButton set="OLL" n={settings.newPerDay} />
              </div>
            )}
          </Step>
          <Step n={3} title={focus.title} minutes="15 min" to={focus.to} action="Start the drill">
            {gaps ? focus.why : `${focus.about} Turn on Split taps in the timer and the plan will pick the focus from your own splits.`}
          </Step>
          <Step n={4} title="Timed solves" minutes="15 min" to="/timer" action="Open the timer">
            Two ao12s with inspection on. Cue for today: {focus.cue}
          </Step>
          <Step n={5} title="Look back" minutes="5 min" to="/stats" action="Open stats">
            Check your slowest cases and drill the worst few.
          </Step>
        </ol>
      </Section>

      <Section title="Road to sub-10">
        <ul className="divide-y divide-rule">
          <Milestone done={known("PLL") === 21} label="Full PLL" detail={`${known("PLL")} of 21 known`} />
          <Milestone done={known("OLL") === 57} label="Full OLL" detail={`${known("OLL")} of 57 known`} />
          <Milestone done={pllRecog != null && pllRecog < 1000} label="Recognise PLL from two sides in under a second" detail={pllRecog ? `median ${fmt(pllRecog)} s` : "not measured yet"} />
          <Milestone done={pllAttack.length > 0 && Math.min(...pllAttack) < 45000} label="PLL time attack under 45 s" detail={pllAttack.length ? `best ${fmt(Math.min(...pllAttack))}` : "not tried yet"} />
          <Milestone done={crossLevel >= 7} label="Find optimal 7-move crosses in inspection" detail={crossLevel ? `optimal up to ${crossLevel} moves` : "not tried yet"} />
          <Milestone done={bestAo12 != null && bestAo12 < 12000} label="Ao12 under 12" detail={bestAo12 ? `best ${fmt(bestAo12, bestAo12 === Infinity)}` : "no ao12 yet"} />
          <Milestone done={bestAo12 != null && bestAo12 < 11000} label="Ao12 under 11" />
          <Milestone done={bestAo12 != null && bestAo12 < 10000} label="Ao12 under 10" />
          <Milestone done={known("COLL") + known("WV") > 0} label="Start COLL or Winter Variation for easy last layers" detail="optional, once full OLL is solid" />
        </ul>
      </Section>
    </div>
  );
}

function Step({ n, title, minutes, to, action, children }: { n: number; title: string; minutes: string; to: string; action: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-x-3 py-4 sm:grid-cols-[2rem_1fr_auto]">
      <span className="font-display text-2xl font-semibold text-ink-3">{n}</span>
      <div>
        <h3 className="font-display text-xl font-semibold">
          {title} <span className="font-sans text-sm font-normal text-ink-3">{minutes}</span>
        </h3>
        <div className="text-ink-2">{children}</div>
      </div>
      <Link
        to={to}
        className="col-start-2 mt-2 self-center justify-self-start rounded-md border border-rule bg-panel px-3.5 py-1.5 font-medium hover:border-ink-3 sm:col-start-3 sm:mt-0"
      >
        {action}
      </Link>
    </li>
  );
}

function Milestone({ done, label, detail }: { done: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-baseline gap-3 py-2">
      <span aria-hidden className={`inline-block size-3 shrink-0 rounded-full border-2 ${done ? "border-ready bg-ready" : "border-rule"}`} />
      <span className={done ? "text-ink-2 line-through decoration-ink-3" : ""}>{label}</span>
      {detail && <span className="ml-auto text-sm text-ink-3">{detail}</span>}
      <span className="sr-only">{done ? "done" : "not done yet"}</span>
    </li>
  );
}
