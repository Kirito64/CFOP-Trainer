/**
 * A 3x3 as 54 stickers in the URFDLB facelet order smart cubes report (each face row by row, as seen
 * looking at it with U up, or F up for U and D). Centers never move: smart cubes report slice and wide
 * turns as outer-face turns, so every sticker can be compared with the face it sits on.
 */

export const FACES = "URFDLB";
export const SOLVED = [...FACES].map((f) => f.repeat(9)).join("");

type Vec = [number, number, number];

// Outward normal, then the directions of "right" and "down" across the face as it is drawn in the net.
const FRAME: Record<string, [Vec, Vec, Vec]> = {
  U: [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
  R: [[1, 0, 0], [0, 0, -1], [0, -1, 0]],
  F: [[0, 0, 1], [1, 0, 0], [0, -1, 0]],
  D: [[0, -1, 0], [1, 0, 0], [0, 0, -1]],
  L: [[-1, 0, 0], [0, 0, 1], [0, -1, 0]],
  B: [[0, 0, -1], [-1, 0, 0], [0, -1, 0]],
};

const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Where each sticker sits (on a cube from -1 to 1) and which way it faces. */
const STICKERS = [...FACES].flatMap((f) => {
  const [n, right, down] = FRAME[f];
  return Array.from({ length: 9 }, (_, i) => ({ face: f, pos: add(add(n, right, (i % 3) - 1), down, Math.floor(i / 3) - 1), normal: n }));
});
const key = (pos: Vec, normal: Vec) => `${pos}|${normal}`;
const INDEX = new Map(STICKERS.map((s, i) => [key(s.pos, s.normal), i]));

/** A quarter turn clockwise, looking at the face: rotate -90° about its normal. */
const turn = (v: Vec, axis: Vec): Vec => add(cross(v, axis), axis, dot(axis, v));

/** For each face, where every sticker goes on a clockwise quarter turn. */
const QUARTER: Record<string, number[]> = Object.fromEntries(
  [...FACES].map((f) => {
    const n = FRAME[f][0];
    return [f, STICKERS.map((s, i) => (dot(s.pos, n) > 0 ? INDEX.get(key(turn(s.pos, n), turn(s.normal, n)))! : i))];
  }),
);

/** Applies one outer-face turn such as "R", "U'" or "F2". */
export function applyMove(facelets: string, move: string): string {
  const to = QUARTER[move[0]];
  if (!to) throw new Error(`Not a face turn: ${move}`);
  const times = move[1] === "2" ? 2 : move[1] === "'" ? 3 : 1;
  let cur = [...facelets];
  for (let t = 0; t < times; t++) {
    const next = new Array<string>(54);
    cur.forEach((c, i) => (next[to[i]] = c));
    cur = next;
  }
  return cur.join("");
}

export const applyAlg = (facelets: string, alg: string) => alg.split(/\s+/).filter(Boolean).reduce(applyMove, facelets);

export const isSolved = (f: string) => f === SOLVED;

// ---------- CFOP stages ----------

const OPPOSITE: Record<string, string> = { U: "D", D: "U", R: "L", L: "R", F: "B", B: "F" };
const normalOf = (face: string) => FRAME[face][0];

/** Stickers of the pieces in a layer of `face`: 1 for that face's layer, 0 for the middle, -1 for the far side. */
const layer = (face: string, depth: number, kind: "edges" | "corners" | "all") =>
  STICKERS.flatMap((s, i) => {
    const nonZero = s.pos.filter((c) => c !== 0).length; // 2 for edges, 3 for corners, 1 for centers
    const ok = kind === "all" ? nonZero > 1 : nonZero === (kind === "edges" ? 2 : 3);
    return ok && dot(s.pos, normalOf(face)) === depth ? [i] : [];
  });

const solvedAt = (f: string, idx: number[]) => idx.every((i) => f[i] === STICKERS[i].face);

const CROSS = Object.fromEntries([...FACES].map((x) => [x, layer(x, 1, "edges")]));
const F2L = Object.fromEntries([...FACES].map((x) => [x, [...layer(x, 1, "all"), ...layer(x, 0, "all")]]));
const LAST_FACE = Object.fromEntries([...FACES].map((x) => [x, STICKERS.flatMap((s, i) => (s.face === OPPOSITE[x] ? [i] : []))]));

/** The cross on `face` (the four edges around it) is solved. */
export const crossDone = (f: string, face: string) => solvedAt(f, CROSS[face]);
/** The first two layers, counting `face` as the cross side, are solved. */
export const f2lDone = (f: string, face: string) => solvedAt(f, F2L[face]);
/** F2L is done and the last layer is oriented: the face opposite the cross is one colour. */
export const ollDone = (f: string, face: string) => f2lDone(f, face) && solvedAt(f, LAST_FACE[face]);

export interface TimedMove {
  move: string;
  /** ms since the timer started. */
  t: number;
}

/**
 * Cross, F2L and OLL split times (cumulative ms, like timer splits) for a solve, worked out from the
 * cube's moves. The cross side is whichever finishes F2L first, so any colour works. Null when the
 * cube didn't end solved.
 */
export function cfopSplits(start: string, moves: TimedMove[]): { splits: [number, number, number]; face: string } | null {
  const states = [start];
  for (const m of moves) states.push(applyMove(states.at(-1)!, m.move));
  if (!isSolved(states.at(-1)!)) return null;
  const timeOf = (k: number) => (k === 0 ? 0 : moves[k - 1].t);
  const first = (from: number, to: number, ok: (f: string) => boolean) => {
    for (let k = from; k <= to; k++) if (ok(states[k])) return k;
    return -1;
  };
  const last = states.length - 1;
  let best: { face: string; f2l: number } | null = null;
  for (const face of FACES) {
    const k = first(0, last, (f) => f2lDone(f, face));
    if (k >= 0 && (!best || k < best.f2l)) best = { face, f2l: k };
  }
  const { face, f2l } = best!;
  const crossK = first(0, f2l, (f) => crossDone(f, face));
  const ollK = first(f2l, last, (f) => ollDone(f, face));
  return { face, splits: [timeOf(crossK), timeOf(f2l), timeOf(ollK)] };
}
