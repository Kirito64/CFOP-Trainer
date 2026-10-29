export type AlgSetId = "F2L" | "OLL" | "PLL" | "COLL" | "WV";

export interface CaseDef {
  id: string;
  name: string;
  group: string;
  /** Alternatives in preference order. Every alg solves the same state (up to the final AUF). */
  algs: string[];
  recognition?: string;
  notes?: string;
  /** Chance of the case coming up in a solve, as a fraction. */
  probability?: number;
  /** Part of the 2-look OLL/PLL subset. */
  twoLook?: boolean;
}

export interface AlgSetDef {
  id: AlgSetId;
  name: string;
  description: string;
  cases: CaseDef[];
}

/** Globally unique case key, e.g. "OLL:OLL 27" or "PLL:T". */
export type CaseKey = `${AlgSetId}:${string}`;
export const caseKey = (set: AlgSetId, id: string): CaseKey => `${set}:${id}`;
