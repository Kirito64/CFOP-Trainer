import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import { Button, fmt } from "../../components/ui";
import { Icon, type IconName } from "../../components/Icon";
import { IsoView } from "../../components/CubeView";
import { caseState } from "../../cube/cube";
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

  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const todaySolves = solves.filter((s) => s.at >= startOfDay).length;
  const milestones = [
    { done: known("PLL") === 21, label: "Full PLL", detail: `${known("PLL")} / 21 known` },
    { done: known("OLL") === 57, label: "Full OLL", detail: `${known("OLL")} / 57 known` },
    { done: pllRecog != null && pllRecog < 1000, label: "Two-sided PLL recognition under 1s", detail: pllRecog != null ? `${fmt(pllRecog)}s median` : "Not measured yet" },
    { done: pllAttack.length > 0 && Math.min(...pllAttack) < 45000, label: "PLL time attack under 45s", detail: pllAttack.length ? `${fmt(Math.min(...pllAttack))} best` : "Not tried yet" },
    { done: crossLevel >= 7, label: "Optimal 7-move crosses", detail: crossLevel ? `Level ${crossLevel} reached` : "Start with the cross trainer" },
    { done: bestAo12 != null && bestAo12 < 12000, label: "Average of 12 under 12s", detail: bestAo12 != null ? `${fmt(bestAo12, bestAo12 === Infinity)} best` : "Establish your baseline" },
    { done: bestAo12 != null && bestAo12 < 11000, label: "Average of 12 under 11s" },
    { done: bestAo12 != null && bestAo12 < 10000, label: "Average of 12 under 10s" },
    { done: known("COLL") + known("WV") > 0, label: "Explore COLL or Winter Variation", detail: "Optional · once full OLL is solid" },
  ];
  const steps: { title: string; detail: string; minutes: number; to: string; icon: IconName }[] = [
    { title: "Wake up your recognition", detail: "Two-sided PLL recognition", minutes: 5, to: "/recognise", icon: "recognise" },
    { title: "Keep your algs sharp", detail: reviewCount ? `${reviewCount} cases ready · ${queue.fresh.length} new` : "Review known cases or learn something new", minutes: 10, to: "/train", icon: "train" },
    { title: focus.title, detail: `${focusKey} · today's training focus`, minutes: 15, to: focus.to, icon: "drills" },
    { title: "Put it all together", detail: "Two averages of 12 with inspection", minutes: 15, to: "/timer", icon: "timer" },
    { title: "Find your next improvement", detail: "Look back at your slowest cases", minutes: 5, to: "/stats", icon: "stats" },
  ];

  return (
    <div className="today-dashboard">
      <header className="today-heading">
        <div><p className="eyebrow">THE DAILY PRACTICE</p><h1>Time to turn up.</h1><p>Small improvements. Faster solves.</p></div>
        <span className="date-label"><Icon name="today" size={16} />{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
      </header>

      <section className="practice-hero" aria-labelledby="practice-heading">
        <div className="hero-copy">
          <span className="hero-tag"><span /> YOUR ROAD TO SUB-{settings.goalMs / 1000}</span>
          <h2 id="practice-heading">One session.<br /><span>A little faster.</span></h2>
          <p>Your next good solve starts here. Warm up, sharpen your algs, and work on what moves you forward.</p>
          <div className="hero-actions"><Link className="action-primary" to="/recognise">Start your warm-up<Icon name="arrow" size={18} /></Link><Link className="hero-secondary" to="/timer"><Icon name="timer" size={17} />Just time some solves</Link></div>
          <div className="hero-meta"><Icon name="clock" size={14} />50 min plan<span>·</span>5 focused steps<span>·</span>Your own pace</div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="cube-orbit orbit-one" /><div className="cube-orbit orbit-two" /><div className="hero-cube"><IsoView state={caseState("R U R' U R U2 R'")} size={240} mask="orientation" /></div><span className="cube-caption">INSPECT / RECOGNISE / EXECUTE</span></div>
      </section>

      <section className="metric-grid" aria-label="Your training at a glance">
        <Metric label="Current average" icon="timer" value={fmt(ao12, ao12 === Infinity)} unit={ao12 != null && Number.isFinite(ao12) ? "s" : ""} detail={ao12 == null ? "12 solves to set your baseline" : "Average of your last 12 solves"} />
        <Metric label="Ready for review" icon="train" value={String(reviewCount)} unit="cases" detail={reviewCount ? `${queue.due.length} due · ${queue.unscheduled.length} to check · ${queue.fresh.length} new` : "Your queue is clear"} accent />
        <Metric label="Last-layer repertoire" icon="library" value={String(known("OLL") + known("PLL"))} unit="/ 78" detail="OLL + PLL algorithms known" />
        <Metric label="Solves today" icon="bolt" value={String(todaySolves)} detail={todaySolves ? "Every solve is useful practice" : "A fresh start. Make it count."} />
      </section>

      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <section className="dashboard-card session-card" aria-labelledby="session-heading">
            <div className="card-heading"><div><p className="eyebrow">SHOW UP. GET SHARPER.</p><h2 id="session-heading">Your session plan</h2></div><span className="subtle-tag">50 MIN</span></div>
            <ol className="session-list">{steps.map((step, i) => <li key={step.title}><Link to={step.to} className={`session-step ${i === 0 ? "session-step-first" : ""}`}><span className="step-index">{String(i + 1).padStart(2, "0")}</span><span className="step-icon"><Icon name={step.icon} /></span><span className="step-copy"><strong>{step.title}</strong><span>{step.detail}</span></span><span className="step-time">{step.minutes} min</span><Icon name="arrow" size={17} /></Link></li>)}</ol>
            <p className="session-footnote">A suggested routine. Jump into any step that fits your day.</p>
          </section>

          <section className="focus-card" aria-labelledby="focus-heading"><span className="focus-icon"><Icon name="target" size={25} /></span><div><p className="eyebrow">{gaps ? "FROM YOUR SPLITS" : "TODAY'S FOCUS"} / {focusKey.toUpperCase()}</p><h2 id="focus-heading">{focus.cue}</h2><p>{gaps ? focus.why : focus.about}</p><Link to={focus.to} className="text-action">Open {focus.title.toLowerCase()}<Icon name="arrow" size={16} /></Link></div></section>
        </div>

        <aside className="dashboard-secondary">
          <section className="dashboard-card repertoire-card" aria-labelledby="repertoire-heading"><div className="card-heading"><h2 id="repertoire-heading">Your repertoire</h2><Icon name="library" size={18} /></div><p className="card-description">Build fluency, one case at a time.</p>
            {(["PLL", "OLL"] as const).map((set) => { const total = set === "PLL" ? 21 : 57; return <Link key={set} to={`/library/${set}`} className="repertoire-row"><div><strong>{set}</strong><span><b>{known(set)}</b> / {total}</span></div><progress value={known(set)} max={total} aria-label={`${set} cases known`} /><span>{known(set) === total ? "All cases known" : `${total - known(set)} more to learn`}<Icon name="chevron" size={12} /></span></Link>; })}
            <Link to="/library/OLL" className="text-action">Explore the library<Icon name="arrow" size={16} /></Link>
          </section>

          <section className="dashboard-card roadmap-card" aria-labelledby="roadmap-heading"><div className="card-heading"><h2 id="roadmap-heading">The sub-10 checklist</h2><Icon name="target" size={18} /></div><p className="card-description">{milestones.filter((m) => m.done).length} of {milestones.length} milestones reached</p><ul>{milestones.slice(0, 2).map((m) => <Milestone key={m.label} {...m} />)}</ul><details><summary>View all milestones<Icon name="chevron" size={14} /></summary><ul>{milestones.slice(2).map((m) => <Milestone key={m.label} {...m} />)}</ul></details></section>

          {nothingSetUp ? <section className="setup-note"><p className="eyebrow">MAKE IT YOURS</p><h2>Already know your PLLs?</h2><p>Tell the trainer where you're starting. Known cases go straight into review.</p><Button onClick={() => Promise.all(allCaseKeys("PLL").map((k) => setStatus(k, "known")))}>I know all 21 PLLs<Icon name="check" size={15} /></Button><Link to="/library/OLL">Choose the OLLs I know<Icon name="arrow" size={14} /></Link></section> : !reviewCount && known("OLL") < 57 ? <section className="setup-note"><p className="eyebrow">ROOM FOR SOMETHING NEW</p><h2>Meet your next OLLs.</h2><p>Your review queue is clear. Add a few new cases to your practice.</p><StartNextButton set="OLL" n={settings.newPerDay} /></section> : null}
        </aside>
      </div>
      <footer className="dashboard-footer"><span>BETTER PRACTICE. BETTER SOLVES.</span><span>Cross. F2L. OLL. PLL.</span></footer>
    </div>
  );
}

function Metric({ label, value, unit, detail, icon, accent }: { label: string; value: string; unit?: string; detail: string; icon: IconName; accent?: boolean }) {
  return <div className={`metric-card ${accent ? "metric-accent" : ""}`}><div className="metric-label">{label}<Icon name={icon} size={17} /></div><div className="metric-value">{value}<span>{unit}</span></div><p>{detail}</p></div>;
}

function Milestone({ done, label, detail }: { done: boolean; label: string; detail?: string }) {
  return <li className={`milestone ${done ? "milestone-done" : ""}`}><span className="milestone-marker">{done && <Icon name="check" size={11} />}</span><div><span>{label}</span>{detail && <small>{detail}</small>}</div><span className="sr-only">{done ? "done" : "not done yet"}</span></li>;
}
