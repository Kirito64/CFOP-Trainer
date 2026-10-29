import { formatMoves, parseAlg } from "../cube/cube";

/** A WCA-style random-state 3x3 scramble (white on top, green in front). */
export async function randomScramble(): Promise<string> {
  const { randomScrambleForEvent } = await import("cubing/scramble");
  return formatMoves(parseAlg((await randomScrambleForEvent("333")).toString()));
}
