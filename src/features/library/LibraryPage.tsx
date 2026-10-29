import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CaseView } from "../../components/CubeView";
import { Button, PageHeader, StatusPill, Tabs } from "../../components/ui";
import { caseState } from "../../cube/cube";
import { ALG_SETS, getSet, groups, VIEW } from "../../data/algsets";
import { type AlgSetId, caseKey } from "../../data/types";
import type { LearnStatus } from "../../db/db";
import { chosenAlg, setStatus, useSetProgress } from "../../db/progress";

export default function LibraryPage() {
  const setId = (useParams().set ?? "OLL") as AlgSetId;
  const navigate = useNavigate();
  const set = getSet(setId);
  const progress = useSetProgress(setId);
  const { view, mask } = VIEW[setId];

  const counts = useMemo(() => {
    const c: Record<LearnStatus, number> = { new: 0, learning: 0, known: 0 };
    for (const def of set.cases) c[progress?.get(caseKey(setId, def.id))?.status ?? "new"]++;
    return c;
  }, [progress, set, setId]);

  const markAll = (ids: string[], status: LearnStatus) => Promise.all(ids.map((id) => setStatus(caseKey(setId, id), status)));

  if (!set) return null;
  return (
    <>
      <PageHeader title="Library">
        Every case with its algs. Pick the alg you use, and mark cases you already know so the trainer schedules them for review instead of
        teaching them.
      </PageHeader>
      <div className="mb-6">
        <Tabs label="Alg set" value={setId} options={ALG_SETS.map((s) => ({ value: s.id, label: s.name }))} onChange={(v) => navigate(`/library/${v}`)} />
      </div>
      <p className="mb-2 max-w-[70ch] text-ink-2">{set.description}</p>
      <p className="mb-8 text-sm text-ink-3">
        {counts.known} known, {counts.learning} learning, {counts.new} not learned
      </p>

      {groups(setId).map(({ group, cases }) => (
        <section key={group} className="mb-9">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-1.5">
            <h2 className="font-display text-2xl font-semibold">
              {group} <span className="text-base font-normal text-ink-3">{cases.length}</span>
            </h2>
            <div className="flex gap-1">
              <Button variant="quiet" className="text-sm" onClick={() => markAll(cases.map((c) => c.id), "known")}>
                Mark all known
              </Button>
              <Button variant="quiet" className="text-sm" onClick={() => markAll(cases.map((c) => c.id), "learning")}>
                Learn all
              </Button>
            </div>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-3 gap-y-5">
            {cases.map((def) => {
              const key = caseKey(setId, def.id);
              const p = progress?.get(key);
              return (
                <li key={def.id}>
                  <Link
                    to={`/library/${setId}/${encodeURIComponent(def.id)}`}
                    className="group flex flex-col items-center gap-1.5 rounded-lg px-2 pt-3 pb-2 transition-colors hover:bg-panel"
                  >
                    <CaseView view={view} mask={mask} size={96} state={caseState(chosenAlg(key, p))} title={def.name} />
                    <span className="font-display text-lg leading-tight font-semibold">{def.id === def.name ? def.id : def.id.replace(/^OLL /, "")}</span>
                    {def.name !== def.id && <span className="-mt-1.5 line-clamp-1 text-center text-sm text-ink-2">{def.name}</span>}
                    <StatusPill status={p?.status ?? "new"} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
