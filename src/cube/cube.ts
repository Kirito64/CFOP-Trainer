// Sticker-level 3x3 model. Same conventions as research/verify_algs.py:
// axes x -> R, y -> U, z -> F; the solving orientation is yellow on top, green in front.

export type Face = "U" | "R" | "F" | "D" | "L" | "B";
export type Vec = readonly [number, number, number];
/** 54 stickers, 9 per face in the order U R F D L B, each read row by row. */
export type CubeState = readonly Face[];
export type Move = { letter: string; turns: number };

export const FACES: readonly Face[] = ["U", "R", "F", "D", "L", "B"];

const NORMAL: Record<Face, Vec> = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1] };
// [screen-right, screen-up] when looking straight at each face in the usual net
const FRAME: Record<Face, [Vec, Vec]> = {
  U: [[1, 0, 0], [0, 0, -1]],
  R: [[0, 0, -1], [0, 1, 0]],
  F: [[1, 0, 0], [0, 1, 0]],
  D: [[1, 0, 0], [0, 0, 1]],
  L: [[0, 0, 1], [0, 1, 0]],
  B: [[-1, 0, 0], [0, 1, 0]],
};

type Sticker = { pos: Vec; normal: Vec };
export const STICKERS: readonly Sticker[] = FACES.flatMap((f) => {
  const [right, up] = FRAME[f];
  const n = NORMAL[f];
  return Array.from({ length: 9 }, (_, i) => {
    const r = Math.floor(i / 3);
    const c = i % 3;
    const pos = [0, 1, 2].map((k) => n[k] + right[k] * (c - 1) + up[k] * (1 - r)) as unknown as Vec;
    return { pos, normal: n };
  });
});

const key = (pos: Vec, normal: Vec) => `${pos.join(",")}|${normal.join(",")}`;
const INDEX = new Map(STICKERS.map((s, i) => [key(s.pos, s.normal), i]));

/** Rotate a vector by q quarter turns counter-clockwise about an axis (looking from its positive end). */
function rot(v: Vec, axis: number, q: number): Vec {
  let [x, y, z] = v;
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) {
    if (axis === 0) [y, z] = [-z, y];
    else if (axis === 1) [z, x] = [-x, z];
    else [x, y] = [-y, x];
  }
  return [x, y, z];
}

// letter -> [axis, quarter turns for a clockwise move, which layers along the axis]
const MOVES: Record<string, [number, number, (c: number) => boolean]> = {
  R: [0, -1, (c) => c === 1],
  L: [0, 1, (c) => c === -1],
  M: [0, 1, (c) => c === 0],
  r: [0, -1, (c) => c >= 0],
  l: [0, 1, (c) => c <= 0],
  x: [0, -1, () => true],
  U: [1, -1, (c) => c === 1],
  D: [1, 1, (c) => c === -1],
  E: [1, 1, (c) => c === 0],
  u: [1, -1, (c) => c >= 0],
  d: [1, 1, (c) => c <= 0],
  y: [1, -1, () => true],
  F: [2, -1, (c) => c === 1],
  B: [2, 1, (c) => c === -1],
  S: [2, -1, (c) => c === 0],
  f: [2, -1, (c) => c >= 0],
  b: [2, 1, (c) => c <= 0],
  z: [2, -1, () => true],
};

/** For each letter, perm[j] = index of the sticker that moves into position j after one clockwise turn. */
const PERMS: Record<string, number[]> = Object.fromEntries(
  Object.entries(MOVES).map(([letter, [axis, q, inLayer]]) => {
    const perm = STICKERS.map((_, i) => i);
    STICKERS.forEach((s, i) => {
      if (!inLayer(s.pos[axis])) return;
      perm[INDEX.get(key(rot(s.pos, axis, q), rot(s.normal, axis, q)))!] = i;
    });
    return [letter, perm];
  }),
);

const TOKEN = /^([RLUDFBMESrludfbxyz])(w?)(\d*)('?)(\d*)$/;

export function parseAlg(alg: string): Move[] {
  return alg
    .replace(/[()[\],’]/g, (ch) => (ch === "’" ? "'" : " "))
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const m = TOKEN.exec(tok);
      if (!m) throw new Error(`Can't read move "${tok}" in "${alg}"`);
      const [, base, wide, n1, prime, n2] = m;
      const n = Number(n1 || n2 || 1);
      return { letter: wide ? base.toLowerCase() : base, turns: prime ? -n : n };
    });
}

export function formatMoves(moves: Move[]): string {
  return moves
    .map(({ letter, turns }) => {
      const t = ((turns % 4) + 4) % 4;
      return t === 0 ? "" : letter + (t === 1 ? "" : t === 2 ? "2" : "'");
    })
    .filter(Boolean)
    .join(" ");
}

export const invertMoves = (moves: Move[]): Move[] => moves.toReversed().map((m) => ({ ...m, turns: -m.turns }));
export const invertAlg = (alg: string) => formatMoves(invertMoves(parseAlg(alg)));

// Mirroring through the M plane: R <-> L, and every move turns the other way,
// except moves on the x axis that keep their meaning (M, x).
const MIRROR: Record<string, [string, number]> = {
  R: ["L", -1], L: ["R", -1], r: ["l", -1], l: ["r", -1], M: ["M", 1], x: ["x", 1],
  U: ["U", -1], D: ["D", -1], E: ["E", -1], u: ["u", -1], d: ["d", -1], y: ["y", -1],
  F: ["F", -1], B: ["B", -1], S: ["S", -1], f: ["f", -1], b: ["b", -1], z: ["z", -1],
};
export const mirrorAlg = (alg: string) =>
  formatMoves(parseAlg(alg).map(({ letter, turns }) => ({ letter: MIRROR[letter][0], turns: turns * MIRROR[letter][1] })));

export function solved(): CubeState {
  return FACES.flatMap((f) => Array<Face>(9).fill(f));
}

export function applyMoves<T = Face>(state: readonly T[], moves: Move[]): readonly T[] {
  let cur = state as T[];
  for (const { letter, turns } of moves) {
    const perm = PERMS[letter];
    for (let t = 0; t < ((turns % 4) + 4) % 4; t++) cur = perm.map((src) => cur[src]);
  }
  return cur;
}

export const applyAlg = (state: CubeState, alg: string) => applyMoves(state, parseAlg(alg));

const centre = (state: CubeState, f: Face) => state[FACES.indexOf(f) * 9 + 4];

const ORIENTATIONS: Move[][] = [0, 1, 2, 3, -1, -3].flatMap((t) =>
  [0, 1, 2, 3].map((y) => [{ letter: t < 0 ? "z" : "x", turns: Math.abs(t) }, { letter: "y", turns: y }]),
);

const centresHome = (s: CubeState) => FACES.every((f) => centre(s, f) === f);

/** Rotate the whole cube so every centre is back in its home position. */
export function normalise(state: CubeState): CubeState {
  for (const o of ORIENTATIONS) {
    const s = applyMoves(state, o);
    if (centresHome(s)) return s;
  }
  throw new Error("No orientation puts the centres home");
}

/** The whole-cube rotation an alg leaves behind (e.g. an A-perm written without its final x'). */
export function netRotation(moves: Move[]): Move[] {
  const s = applyMoves(solved(), moves);
  const o = ORIENTATIONS.find((o) => centresHome(applyMoves(s, o)));
  if (!o) throw new Error("No orientation puts the centres home");
  return invertMoves(o);
}

/** The state an alg solves: inverse(alg) applied to a solved cube held in the alg's final orientation. */
export function caseState(alg: string, { preAuf = 0, postAuf = 0, before = solved() } = {}): CubeState {
  const moves = parseAlg(alg);
  return normalise(
    applyMoves(before, [{ letter: "U", turns: preAuf }, ...netRotation(moves), ...invertMoves(moves), { letter: "U", turns: postAuf }]),
  );
}

/** Index of the sticker at row/col of a face (rows top to bottom as seen in the usual net). */
export const at = (face: Face, row: number, col: number) => FACES.indexOf(face) * 9 + row * 3 + col;

/** The colours of the piece each sticker belongs to, used to grey out pieces a stage doesn't care about. */
export const PIECE_OF: readonly number[][] = STICKERS.map((s) =>
  STICKERS.flatMap((t, j) => (t.pos.every((v, k) => v === s.pos[k]) ? [j] : [])),
);

export function isSolved(state: CubeState) {
  return FACES.every((_, fi) => state.slice(fi * 9, fi * 9 + 9).every((c) => c === state[fi * 9 + 4]));
}
