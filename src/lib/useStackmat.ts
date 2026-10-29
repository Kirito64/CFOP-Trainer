import { useCallback, useEffect, useRef, useState } from "react";

export type TimerPhase = "idle" | "holding" | "ready" | "running" | "stopped";

interface Options {
  /** How long space must be held before the timer arms (ms). */
  holdMs?: number;
  /** Whether the timer accepts input right now (e.g. false while a dialog is open). */
  enabled?: boolean;
  onStart?: () => void;
  /** Called with the elapsed time in ms and any split times. */
  onStop?: (ms: number, splits: number[]) => void;
  /** Number of phases: with more than 1, each press while running records a split and the last press stops. */
  phases?: number;
}

const isTyping = (e: Event) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
};

/**
 * Stackmat-style timer: hold space (or touch the pad) until it turns green, release to start,
 * press any key or touch to stop.
 */
export function useStackmat({ holdMs = 300, enabled = true, onStart, onStop, phases = 1 }: Options = {}) {
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const phaseRef = useRef<TimerPhase>("idle");
  const startedAt = useRef(0);
  const holdTimer = useRef<number | undefined>(undefined);
  const raf = useRef<number | undefined>(undefined);
  const splitsRef = useRef<number[]>([]);
  const [splits, setSplits] = useState<number[]>([]);
  const cb = useRef({ onStart, onStop });
  cb.current = { onStart, onStop };

  const go = (p: TimerPhase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const tick = useCallback(() => {
    setElapsed(performance.now() - startedAt.current);
    raf.current = requestAnimationFrame(tick);
  }, []);

  const press = useCallback(() => {
    const p = phaseRef.current;
    if (p === "running") {
      const ms = performance.now() - startedAt.current;
      if (splitsRef.current.length < phases - 1) {
        splitsRef.current = [...splitsRef.current, ms];
        setSplits(splitsRef.current);
        return true;
      }
      cancelAnimationFrame(raf.current!);
      setElapsed(ms);
      go("stopped");
      cb.current.onStop?.(ms, splitsRef.current);
      return true;
    }
    if (p === "idle" || p === "stopped") {
      go("holding");
      holdTimer.current = window.setTimeout(() => phaseRef.current === "holding" && go("ready"), holdMs);
      return true;
    }
    return false;
  }, [holdMs, phases]);

  const release = useCallback(() => {
    const p = phaseRef.current;
    clearTimeout(holdTimer.current);
    if (p === "ready") {
      startedAt.current = performance.now();
      splitsRef.current = [];
      setSplits([]);
      setElapsed(0);
      go("running");
      cb.current.onStart?.();
      raf.current = requestAnimationFrame(tick);
    } else if (p === "holding") go("idle");
  }, [tick]);

  useEffect(() => {
    if (!enabled) return;
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || e.repeat) {
        if (e.code === "Space" && !isTyping(e)) e.preventDefault();
        return;
      }
      if (phaseRef.current === "running") {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        press();
      } else if (e.code === "Space") {
        e.preventDefault();
        press();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e)) {
        e.preventDefault();
        release();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enabled, press, release]);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current!);
    clearTimeout(holdTimer.current);
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame(raf.current!);
    clearTimeout(holdTimer.current);
    splitsRef.current = [];
    setSplits([]);
    setElapsed(0);
    go("idle");
  }, []);

  /** Props for a touch/click pad so the timer works on phones and tablets. */
  const padProps = {
    onPointerDown: (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      press();
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      release();
    },
  };

  return { phase, elapsed, splits, reset, padProps, isRunning: phase === "running" };
}
