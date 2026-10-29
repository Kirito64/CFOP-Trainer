import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { PageHeader, Tabs } from "../../components/ui";
import { db } from "../../db/db";
import { useSettings } from "../../db/settings";
import { slowSolves, speedSolves } from "../../db/solves";
import { useLocalDay } from "../../lib/useLocalDay";
import { STATS_VISIT_KEY } from "../today/sessionProgress";
import { CasesTab } from "./CasesTab";
import { PracticeTab } from "./PracticeTab";
import { SolvesTab } from "./SolvesTab";

const TABS = [
  { value: "solves", label: "Solves" },
  { value: "cases", label: "Cases" },
  { value: "practice", label: "Practice" },
] as const;
type Tab = (typeof TABS)[number]["value"];

export default function StatsPage() {
  const day = useLocalDay();
  useEffect(() => {
    const recordVisit = () => {
      // A background Stats tab left open overnight is not a new visit until it is shown.
      if (document.visibilityState !== "visible") return;
      void db.meta.put({ key: STATS_VISIT_KEY, value: Date.now() }).catch((error) => console.error("Could not record Stats visit", error));
    };
    recordVisit();
    document.addEventListener("visibilitychange", recordVisit);
    return () => document.removeEventListener("visibilitychange", recordVisit);
  }, [day.start]);

  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.value === params.get("tab"))?.value ?? "solves";
  const setTab = (next: Tab) => setParams((p) => (p.set("tab", next), p), { replace: true });

  const { goalMs } = useSettings();
  const solves = useLiveQuery(speedSolves, []);
  const slow = useLiveQuery(slowSolves, []);
  const attempts = useLiveQuery(async () => (await db.attempts.orderBy("at").toArray()).filter((a) => !a.deleted), []);
  const drills = useLiveQuery(async () => (await db.drills.orderBy("at").toArray()).filter((d) => !d.deleted), []);
  const progress = useLiveQuery(async () => new Map((await db.progress.toArray()).map((p) => [p.id, p])), []);
  const ready = solves && slow && attempts && drills && progress;

  return (
    <>
      <PageHeader title="Stats">Where your time goes, which cases are holding you back, and how your practice is adding up.</PageHeader>
      <div className="mb-6">
        <Tabs<Tab> label="Stats" value={tab} onChange={setTab} options={TABS} />
      </div>
      {ready && tab === "solves" && <SolvesTab solves={solves} goalMs={goalMs} />}
      {ready && tab === "cases" && <CasesTab attempts={attempts} progress={progress} solves={solves} />}
      {ready && tab === "practice" && <PracticeTab solves={solves} slow={slow} attempts={attempts} drills={drills} />}
    </>
  );
}
