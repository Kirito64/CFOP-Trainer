import { Link } from "react-router";
import { PageHeader } from "../../components/ui";

export const DRILLS = [
  {
    id: "cross",
    name: "Cross trainer",
    trains: "Inspection and cross efficiency",
    how: "Plan the whole cross in inspection, then solve it without looking. Scrambles get harder as you find the optimal cross.",
  },
  {
    id: "metronome",
    name: "Metronome solves",
    trains: "Lookahead and turning without pauses",
    how: "Solve slowly with one turn per click and never stop. When you can keep up, raise the tempo.",
  },
  {
    id: "pll-attack",
    name: "PLL time attack",
    trains: "PLL execution",
    how: "Do all 21 PLLs back to back for time. Under 45 seconds is a good target on the way to sub-10.",
  },
  {
    id: "tps",
    name: "Alg sprints",
    trains: "Turning speed on one alg",
    how: "Do one alg five times in a row and get your turns per second. Good for the algs that drag in your solves.",
  },
] as const;

export default function DrillsPage() {
  return (
    <>
      <PageHeader title="Drills">
        Focused practice for the parts of a solve that alg training doesn't reach. At 13 seconds, the biggest gains are usually in the cross
        and the pauses between F2L pairs.
      </PageHeader>
      <ul className="grid max-w-4xl gap-x-10 gap-y-2 md:grid-cols-2">
        {DRILLS.map((d) => (
          <li key={d.id} className="border-t border-rule">
            <Link to={`/drills/${d.id}`} className="group block py-4">
              <h2 className="font-display text-2xl font-semibold group-hover:underline">{d.name}</h2>
              <p className="text-sm font-medium text-steel">{d.trains}</p>
              <p className="mt-1 text-ink-2">{d.how}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
