import { at, caseState, type CubeState, FACES, type Face, PIECE_OF, STICKERS } from "./cube";

const home = (i: number): Face => FACES[Math.floor(i / 9)];
const y = (i: number) => STICKERS[i].pos[1];
const xz = (i: number) => [STICKERS[i].pos[0], STICKERS[i].pos[2]] as const;

/** Stickers on the U face plus the top row of each side. */
export const LL_STICKERS = STICKERS.flatMap((_, i) => (y(i) === 1 ? [i] : []));
const F2L_STICKERS = STICKERS.flatMap((_, i) => (y(i) < 1 ? [i] : []));
const U_FACE = LL_STICKERS.filter((i) => home(i) === "U");

export type Slot = "FR" | "FL" | "BR" | "BL";
const SLOT_XZ: Record<Slot, [number, number]> = { FR: [1, 1], FL: [-1, 1], BR: [1, -1], BL: [-1, -1] };
const inSlot = (i: number, slot: Slot) => y(i) < 1 && xz(i)[0] === SLOT_XZ[slot][0] && xz(i)[1] === SLOT_XZ[slot][1];

const solvedAt = (s: CubeState, idx: number[]) => idx.every((i) => s[i] === home(i));

export const f2lSolved = (s: CubeState) => solvedAt(s, F2L_STICKERS);
export const llOriented = (s: CubeState) => U_FACE.every((i) => s[i] === "U");
export const slotSolved = (s: CubeState, slot: Slot) => solvedAt(s, F2L_STICKERS.filter((i) => inSlot(i, slot)));
/** Cross and every slot except `slot` solved. */
export const restOfF2lSolved = (s: CubeState, slot: Slot) => solvedAt(s, F2L_STICKERS.filter((i) => !inSlot(i, slot)));

/** Every U-coloured edge in the top layer has its U sticker on top. */
export const llEdgesOriented = (s: CubeState) =>
  [at("U", 0, 1), at("U", 1, 0), at("U", 1, 2), at("U", 2, 1)].every(
    (i) => s[i] === "U" || !PIECE_OF[i].some((j) => s[j] === "U"),
  );

const SIDES: Face[] = ["F", "R", "B", "L"];
/** A sticker's colour relative to the face it's on, so recolourings (y-rotations) of a case look identical. */
function relative(s: CubeState, i: number): string {
  const c = s[i];
  const f = home(i);
  if (SIDES.includes(c) && SIDES.includes(f)) return String((SIDES.indexOf(c) - SIDES.indexOf(f) + 4) % 4);
  return c === f ? "=" : c;
}

const minOf = (xs: string[]) => xs.reduce((a, b) => (b < a ? b : a));
const AUFS = [0, 1, 2, 3];

/** Signature of a last-layer case that ignores pre-AUF, post-AUF and colour scheme. */
export function llSignature(alg: string, mode: "orientation" | "full" | "corners"): string {
  const stickers = mode === "corners" ? LL_STICKERS.filter((i) => PIECE_OF[i].length === 3) : LL_STICKERS;
  const read = (s: CubeState) => stickers.map((i) => (mode === "orientation" ? (s[i] === "U" ? "1" : "0") : relative(s, i))).join("");
  const pres = mode === "orientation" ? [0] : AUFS;
  return minOf(pres.flatMap((preAuf) => AUFS.map((postAuf) => read(caseState(alg, { preAuf, postAuf })))));
}

/** Signature of an F2L case: where the slot's corner and edge stickers sit, up to AUF. */
export function pairSignature(alg: string, slot: Slot = "FR"): string {
  const pairStickers = STICKERS.flatMap((_, i) => (inSlot(i, slot) && PIECE_OF[i].length > 1 ? [i] : []));
  const colours = new Set(pairStickers.map((i) => PIECE_OF[i].map(home).sort().join("")));
  return minOf(
    AUFS.map((postAuf) => {
      const s = caseState(alg, { postAuf });
      return STICKERS.flatMap((_, i) => (colours.has(PIECE_OF[i].map((j) => s[j]).sort().join("")) ? [`${i}${s[i]}`] : [])).join(" ");
    }),
  );
}
