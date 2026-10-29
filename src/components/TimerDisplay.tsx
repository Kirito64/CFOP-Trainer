import type { TimerPhase } from "../lib/useStackmat";
import { fmt } from "./ui";

const PHASE_COLOUR: Record<TimerPhase, string> = {
  idle: "text-ink",
  holding: "text-hold",
  ready: "text-ready",
  running: "text-ink",
  stopped: "text-ink",
};

/** The stackmat readout: big condensed digits, red while held, green when ready. */
export function TimerDisplay({
  phase,
  ms,
  hideWhileRunning = false,
  penalty,
  size = "xl",
  padProps,
}: {
  phase: TimerPhase;
  ms: number;
  hideWhileRunning?: boolean;
  penalty?: 0 | 2 | "DNF";
  size?: "lg" | "xl";
  padProps?: Record<string, unknown>;
}) {
  const text =
    phase === "running" && hideWhileRunning ? "solve" : penalty === "DNF" ? "DNF" : fmt(ms + (penalty === 2 ? 2000 : 0)) + (penalty === 2 ? "+" : "");
  return (
    <div
      {...padProps}
      className="flex touch-none flex-col items-center justify-center select-none"
      aria-live={phase === "stopped" ? "polite" : "off"}
    >
      <div
        className={`font-display leading-none font-semibold tracking-tight transition-colors duration-75 ${PHASE_COLOUR[phase]} ${
          size === "xl" ? "text-[clamp(5rem,16vw,11rem)]" : "text-[clamp(3.5rem,10vw,6.5rem)]"
        }`}
      >
        {text}
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm text-ink-3" aria-hidden>
        <span className={`size-2.5 rounded-full ${phase === "holding" ? "bg-hold" : "bg-rule"}`} />
        <span className={`size-2.5 rounded-full ${phase === "ready" ? "bg-ready" : "bg-rule"}`} />
      </div>
    </div>
  );
}
