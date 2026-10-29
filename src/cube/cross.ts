import { applyAlg, applyMoves, type CubeState, FACES, type Face, formatMoves, type Move, parseAlg, PIECE_OF, STICKERS } from "./cube";

// Optimal white cross (on D in the solving orientation) by breadth-first search over the
// positions of the four cross edges: 24^4 = 331,776 states, built once on first use.

const FACE_MOVES: Move[] = (["U", "D", "R", "L", "F", "B"] as const).flatMap((letter) => [1, 2, -1].map((turns) => ({ letter, turns })));

/** Every edge sticker index, so that "sticker i of a white edge" encodes position and flip in one number (0..23). */
const EDGE_STICKERS = STICKERS.flatMap((_, i) => (PIECE_OF[i].length === 2 ? [i] : []));
const SLOT = new Map(EDGE_STICKERS.map((i, k) => [i, k]));

/** next[m][k] = edge-sticker slot that slot k moves to under move m. */
const NEXT: number[][] = FACE_MOVES.map((m) => {
  const marked = applyMoves(
    STICKERS.map((_, i) => i),
    [m],
  );
  const to = new Array<number>(STICKERS.length);
  marked.forEach((src, dst) => (to[src] = dst));
  return EDGE_STICKERS.map((i) => SLOT.get(to[i])!);
});

const home = (i: number): Face => FACES[Math.floor(i / 9)];
/** For each cross edge (DF, DR, DB, DL), the slot of its white sticker in a solved cube. */
const CROSS_WHITE = EDGE_STICKERS.filter((i) => home(i) === "D");

const encode = (slots: number[]) => ((slots[0] * 24 + slots[1]) * 24 + slots[2]) * 24 + slots[3];
const decode = (code: number) => [Math.floor(code / 13824), Math.floor(code / 576) % 24, Math.floor(code / 24) % 24, code % 24];

let table: Int8Array | undefined;
function distances(): Int8Array {
  if (table) return table;
  const dist = new Int8Array(24 ** 4).fill(-1);
  const start = encode(CROSS_WHITE.map((i) => SLOT.get(i)!));
  dist[start] = 0;
  let frontier = [start];
  for (let d = 0; frontier.length; d++) {
    const next: number[] = [];
    for (const code of frontier) {
      const slots = decode(code);
      for (const n of NEXT) {
        const c = encode(slots.map((s) => n[s]));
        if (dist[c] === -1) {
          dist[c] = d + 1;
          next.push(c);
        }
      }
    }
    frontier = next;
  }
  return (table = dist);
}

/** Where the white sticker of each cross edge sits in a cube state. */
function crossCode(state: CubeState): number {
  const slots = CROSS_WHITE.map((solvedAt) => {
    const colours = PIECE_OF[solvedAt].map(home).sort().join("");
    const at = EDGE_STICKERS.find((i) => state[i] === "D" && PIECE_OF[i].map((j) => state[j]).sort().join("") === colours)!;
    return SLOT.get(at)!;
  });
  return encode(slots);
}

/** Converts a scramble written for white on top / green in front into our yellow-on-top frame (a z2 relabel). */
export const toSolvingFrame = (scramble: string) =>
  formatMoves(parseAlg(scramble).map((m) => ({ ...m, letter: ({ U: "D", D: "U", R: "L", L: "R" } as Record<string, string>)[m.letter] ?? m.letter })));

export function crossLength(scrambleInSolvingFrame: string): number {
  return distances()[crossCode(applyAlg(stateOf(), scrambleInSolvingFrame))];
}

/** One optimal cross solution, white on the bottom. */
export function optimalCross(scrambleInSolvingFrame: string): string {
  const dist = distances();
  let slots = decode(crossCode(applyAlg(stateOf(), scrambleInSolvingFrame)));
  const out: Move[] = [];
  while (dist[encode(slots)] > 0) {
    const d = dist[encode(slots)];
    const k = NEXT.findIndex((n) => dist[encode(slots.map((s) => n[s]))] === d - 1);
    out.push(FACE_MOVES[k]);
    slots = slots.map((s) => NEXT[k][s]);
  }
  return formatMoves(out);
}

const stateOf = (): CubeState => FACES.flatMap((f) => Array<Face>(9).fill(f));
