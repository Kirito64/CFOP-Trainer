import { formatMoves, parseAlg } from "../cube/cube";

/** A WCA-style random-state 3x3 scramble (white on top, green in front). */
export async function randomScramble(): Promise<string> {
  const [{ randomScrambleForEvent }, { setSearchDebug }] = await Promise.all([import("cubing/scramble"), import("cubing/search")]);
  // cubing.js logs the time of every scramble as a console warning by default.
  setSearchDebug({ logPerf: false });
  return formatMoves(parseAlg((await randomScrambleForEvent("333")).toString()));
}
