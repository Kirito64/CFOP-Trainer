import { useEffect, useRef, useState } from "react";
import { Button, Kbd } from "../../components/ui";
import { addDrillResult, useDrillResults } from "../../db/drills";

/** A scheduled Web Audio click track: steady even when the tab is busy. */
function useClickTrack(bpm: number, running: boolean) {
  const ctx = useRef<AudioContext | null>(null);
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!running) return;
    ctx.current ??= new AudioContext();
    const ac = ctx.current;
    void ac.resume();
    const interval = 60 / bpm;
    let next = ac.currentTime + 0.1;
    let n = 0;
    const timer = setInterval(() => {
      while (next < ac.currentTime + 0.2) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.frequency.value = n % 4 === 0 ? 1500 : 1000;
        gain.gain.setValueAtTime(0.25, next);
        gain.gain.exponentialRampToValueAtTime(0.001, next + 0.05);
        osc.connect(gain).connect(ac.destination);
        osc.start(next);
        osc.stop(next + 0.06);
        const at = next;
        const count = n;
        setTimeout(() => setBeat(count), Math.max(0, (at - ac.currentTime) * 1000));
        next += interval;
        n++;
      }
    }, 25);
    return () => clearInterval(timer);
  }, [bpm, running]);
  return beat;
}

export function Metronome() {
  const results = useDrillResults("metronome");
  const [bpm, setBpm] = useState(() => (results?.at(-1)?.score as number | undefined) ?? 150);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const beat = useClickTrack(bpm, running);

  const toggle = async () => {
    if (running) {
      setRunning(false);
      const minutes = (performance.now() - startedAt) / 60000;
      if (minutes > 0.5) await addDrillResult("metronome", bpm, { minutes: Math.round(minutes * 10) / 10 });
    } else {
      setStartedAt(performance.now());
      setRunning(true);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space") {
        e.preventDefault();
        void toggle();
      }
      if (e.key === "ArrowUp") setBpm((b) => Math.min(480, b + 5));
      if (e.key === "ArrowDown") setBpm((b) => Math.max(40, b - 5));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const best = results?.reduce((m, r) => Math.max(m, r.score), 0);

  return (
    <div className="flex max-w-2xl flex-col items-start gap-6">
      <div className="flex items-end gap-6">
        <div>
          <div className="font-display text-8xl leading-none font-semibold">{bpm}</div>
          <div className="text-ink-2">clicks a minute, {(bpm / 60).toFixed(1)} turns a second</div>
        </div>
        <div className="mb-3 flex gap-1.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`size-4 rounded-full ${running && beat % 4 === i ? (i === 0 ? "bg-steel" : "bg-ink-2") : "bg-rule"}`} />
          ))}
        </div>
      </div>
      <input
        type="range"
        min={40}
        max={480}
        step={5}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        aria-label="Tempo"
        className="w-full max-w-md accent-[var(--steel)]"
      />
      <div className="flex gap-2">
        <Button variant="primary" onClick={toggle}>
          {running ? "Stop" : "Start"} <Kbd>Space</Kbd>
        </Button>
        <span className="self-center text-sm text-ink-3">
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> change tempo by 5
        </span>
      </div>
      <div className="max-w-[65ch] text-ink-2">
        <p className="mb-2">
          Make one turn on every click, from the first cross move to the last PLL move, and don't stop between F2L pairs. If you miss clicks
          while looking for the next pair, slow down. When a few solves in a row go cleanly, raise the tempo by 10.
        </p>
        <p>
          Your solves at 13 seconds run at roughly 4 turns a second including pauses. Sub-10 is about 6 with almost no pauses, so smooth and steady
          at 180 to 240 clicks a minute is the bridge.
        </p>
      </div>
      {!!best && <p className="text-sm text-ink-3">Highest tempo you've practised at: {best} clicks a minute.</p>}
    </div>
  );
}
