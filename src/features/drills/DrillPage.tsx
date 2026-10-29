import { Link, useParams } from "react-router";
import { PageHeader } from "../../components/ui";
import { CrossDrill } from "./CrossDrill";
import { DRILLS } from "./DrillsPage";
import { Metronome } from "./Metronome";
import { PllAttack } from "./PllAttack";
import { TpsSprint } from "./TpsSprint";

const COMPONENTS = { cross: CrossDrill, metronome: Metronome, "pll-attack": PllAttack, tps: TpsSprint };

export default function DrillPage() {
  const id = useParams().drill as keyof typeof COMPONENTS;
  const drill = DRILLS.find((d) => d.id === id);
  const Drill = COMPONENTS[id];
  if (!drill || !Drill) return <p>That drill doesn't exist.</p>;
  return (
    <>
      <Link to="/drills" className="text-sm text-ink-2 hover:text-ink">
        ← Drills
      </Link>
      <div className="mt-2">
        <PageHeader title={drill.name}>{drill.how}</PageHeader>
      </div>
      <Drill />
    </>
  );
}
