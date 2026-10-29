import type { AlgSetId } from "../data/types";
import { f2lSolved, llEdgesOriented, llOriented, llSignature, pairSignature, restOfF2lSolved } from "./cases";
import { caseState, parseAlg } from "./cube";

const SIGNATURE: Record<AlgSetId, (alg: string) => string> = {
  OLL: (a) => llSignature(a, "orientation"),
  PLL: (a) => llSignature(a, "full"),
  COLL: (a) => llSignature(a, "corners"),
  F2L: (a) => pairSignature(a),
  WV: (a) => pairSignature(a) + llSignature(a, "orientation"),
};

const VALID_STATE: Record<AlgSetId, (alg: string) => boolean> = {
  OLL: (a) => f2lSolved(caseState(a)),
  PLL: (a) => f2lSolved(caseState(a)) && llOriented(caseState(a)),
  COLL: (a) => f2lSolved(caseState(a)) && llEdgesOriented(caseState(a)),
  F2L: (a) => restOfF2lSolved(caseState(a), "FR"),
  WV: (a) => restOfF2lSolved(caseState(a), "FR") && llEdgesOriented(caseState(a)),
};

/** Returns an error message, or null when `alg` solves the same case as `reference`. */
export function checkAlg(set: AlgSetId, alg: string, reference: string): string | null {
  try {
    if (!parseAlg(alg).length) return "Type an alg first.";
  } catch (e) {
    return (e as Error).message;
  }
  if (!VALID_STATE[set](alg)) return set === "F2L" || set === "WV" ? "This alg disturbs the cross or another slot." : "This alg breaks the first two layers.";
  if (SIGNATURE[set](alg) !== SIGNATURE[set](reference)) return "This alg solves a different case.";
  return null;
}
