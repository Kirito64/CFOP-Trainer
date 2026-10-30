import { useSyncExternalStore } from "react";
import { applyMove, SOLVED } from "../cube3";

/** What a cube driver reports back. */
export interface DriverEvents {
  move(move: string): void;
  /** The cube's own idea of its state, in URFDLB facelet order. */
  facelets(facelets: string): void;
  battery(level: number): void;
  disconnected(): void;
}

export interface Driver {
  name: string;
  /** Whether the cube can be told it's solved, for when its state has drifted. */
  canReset: boolean;
  reset(): Promise<void>;
  disconnect(): Promise<void>;
}

export type CubeState =
  | { status: "idle" }
  | { status: "connecting"; message: string }
  | { status: "connected"; name: string; battery: number | null; facelets: string; canReset: boolean }
  | { status: "error"; message: string; needsAddress?: boolean };

/** Browsers that can talk to Bluetooth cubes: Chrome and Edge on desktop and Android. */
export const bluetoothSupported = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

let state: CubeState = { status: "idle" };
let driver: Driver | null = null;
const watchers = new Set<() => void>();
const moveListeners = new Set<(move: string, facelets: string, at: number) => void>();

function set(next: CubeState) {
  state = next;
  for (const w of watchers) w();
}

/** The cube's connection state, kept across pages so the cube stays connected while you move around. */
export function useCube(): CubeState {
  return useSyncExternalStore(
    (w) => (watchers.add(w), () => watchers.delete(w)),
    () => state,
  );
}

/** Called with every turn of the connected cube, the state after it, and when it arrived (performance.now()). */
export function onCubeMove(listener: (move: string, facelets: string, at: number) => void): () => void {
  moveListeners.add(listener);
  return () => moveListeners.delete(listener);
}

const events: DriverEvents = {
  move(move) {
    if (state.status !== "connected") return;
    const at = performance.now();
    const facelets = applyMove(state.facelets, move);
    set({ ...state, facelets });
    for (const l of moveListeners) l(move, facelets, at);
  },
  facelets(facelets) {
    if (state.status === "connected" && facelets.length === 54 && facelets !== state.facelets) set({ ...state, facelets });
  },
  battery(level) {
    if (state.status === "connected") set({ ...state, battery: level });
  },
  disconnected() {
    driver = null;
    set({ status: "idle" });
  },
};

type Connect = (events: DriverEvents, onStatus: (message: string) => void) => Promise<Driver>;

async function connectWith(connect: Connect) {
  if (state.status === "connecting" || state.status === "connected") return;
  set({ status: "connecting", message: "Choose your cube…" });
  try {
    const d = await connect(events, (message) => state.status === "connecting" && set({ status: "connecting", message }));
    driver = d;
    // Assume solved until the cube says otherwise; most cubes report their state as soon as they connect.
    set({ status: "connected", name: d.name, battery: null, facelets: SOLVED, canReset: d.canReset });
  } catch (e) {
    const err = e as Error;
    // Closing the browser's cube picker isn't an error.
    if (err.name === "NotFoundError" && /cancel/i.test(err.message)) set({ status: "idle" });
    else set({ status: "error", message: err.message || String(err), needsAddress: /MAC address/i.test(err.message) });
  }
}

/** Opens the browser's Bluetooth picker and connects to the chosen cube. */
export async function connectCube() {
  await connectWith(async (ev, onStatus) => (await import("./bluetooth")).connectBluetooth(ev, onStatus));
}

export async function disconnectCube() {
  const d = driver;
  driver = null;
  set({ status: "idle" });
  await d?.disconnect().catch(() => {});
}

/** Tells the cube it's solved, for when the app's idea of the cube no longer matches the real one. */
export async function markCubeSolved() {
  if (state.status !== "connected" || !driver) return;
  await driver.reset();
  set({ ...state, facelets: SOLVED });
}

// A pretend cube for development and browser tests: window.__cube.connect(), then window.__cube.turn("R U R'").
if (import.meta.env.DEV && typeof window !== "undefined") {
  let ev: DriverEvents | null = null;
  (window as unknown as { __cube: unknown }).__cube = {
    connect: () =>
      connectWith(async (e) => {
        ev = e;
        return {
          name: "Simulated cube",
          canReset: true,
          reset: async () => {},
          disconnect: async () => {
            ev = null;
          },
        };
      }),
    turn: (alg: string) => alg.split(/\s+/).filter(Boolean).forEach((m) => ev?.move(m)),
  };
}
