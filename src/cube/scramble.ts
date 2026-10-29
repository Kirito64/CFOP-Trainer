import type { AlgSetId } from "../data/types";
import { applyAlg, type CubeState, formatMoves, invertMoves, mirrorAlg, netRotation, normalise, parseAlg, solved } from "./cube";

const AUF = ["", "U", "U2", "U'"];
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export interface CaseRequest {
  set: AlgSetId;
  /** The alg that solves the case (setup = its inverse). */
  alg: string;
  /** For F2L: mirror into the front-left slot. */
  mirror?: boolean;
  /** Random algs used to scramble the parts of the cube the case doesn't care about. */
  noise: { pll: string[]; oll: string[] };
}

/** The moves that, from solved, produce the case with random AUFs and a random rest-of-cube. */
export function setupFor(req: CaseRequest): string {
  const undo = (alg: string) => {
    const m = parseAlg(alg);
    return formatMoves([...netRotation(m), ...invertMoves(m)]);
  };
  const randomPll = () => `${pick(AUF)} ${undo(pick(req.noise.pll))}`;
  const randomLl = () => `${randomPll()} ${pick(AUF)} ${undo(pick(req.noise.oll))}`;
  // Everything before the case setup randomises pieces the case alg doesn't touch:
  // PLL needs nothing, OLL a random permutation, COLL/WV random edge permutation, F2L a random last layer.
  const before = { PLL: "", OLL: randomPll(), COLL: randomPll(), WV: randomPll(), F2L: randomLl() }[req.set];
  return `${before} ${pick(AUF)} ${undo(req.alg)} ${pick(AUF)}`.trim();
}

let solverPromise: Promise<(setup: string) => Promise<string>> | undefined;

/** Lazily loads cubing.js's two-phase solver (it runs in a worker and builds tables on first use). */
function solver() {
  solverPromise ??= Promise.all([import("cubing/puzzles"), import("cubing/search"), import("cubing/alg")]).then(
    async ([{ cube3x3x3 }, { experimentalSolve3x3x3IgnoringCenters, setSearchDebug }, { Alg }]) => {
      setSearchDebug({ logPerf: false });
      const kpuzzle = await cube3x3x3.kpuzzle();
      return async (setup: string) => {
        const pattern = kpuzzle.defaultPattern().applyAlg(new Alg(setup));
        const solution = await experimentalSolve3x3x3IgnoringCenters(pattern);
        return formatMoves(parseAlg(solution.invert().toString()));
      };
    },
  );
  return solverPromise;
}

export interface CaseScramble {
  scramble: string;
  /** The state the user ends up holding (yellow top, green front). */
  state: CubeState;
}

/**
 * A random-state scramble for a case: the user can't read the solution off it,
 * and AUF plus the rest of the last layer are random.
 */
export async function scrambleForCase(req: CaseRequest): Promise<CaseScramble> {
  const setupAlg = req.mirror ? mirrorAlg(setupFor(req)) : setupFor(req);
  const state = normalise(applyAlg(solved(), setupAlg));
  const solve = await solver();
  for (let attempt = 0; attempt < 3; attempt++) {
    const scramble = await solve(setupAlg);
    // Guard against any centre/orientation mismatch between the two cube models.
    if (scramble.split(" ").length > 4 && sameState(normalise(applyAlg(solved(), scramble)), state)) return { scramble, state };
  }
  return { scramble: setupAlg, state };
}

const sameState = (a: CubeState, b: CubeState) => a.every((c, i) => c === b[i]);
