import raw from "./algsets.json";
import { type AlgSetDef, type AlgSetId, type CaseDef, type CaseKey, caseKey } from "./types";

export const ALG_SETS = raw as AlgSetDef[];

const byKey = new Map<CaseKey, { set: AlgSetDef; def: CaseDef }>(
  ALG_SETS.flatMap((set) => set.cases.map((def) => [caseKey(set.id, def.id), { set, def }] as const)),
);

export const getSet = (id: AlgSetId) => ALG_SETS.find((s) => s.id === id)!;
export const getCase = (key: CaseKey) => byKey.get(key);
export const allCaseKeys = (id: AlgSetId) => getSet(id).cases.map((c) => caseKey(id, c.id));

/** Cases grouped in the order the groups first appear in the data. */
export function groups(id: AlgSetId): { group: string; cases: CaseDef[] }[] {
  const out = new Map<string, CaseDef[]>();
  for (const c of getSet(id).cases) out.set(c.group, [...(out.get(c.group) ?? []), c]);
  return [...out].map(([group, cases]) => ({ group, cases }));
}

/** How each set is drawn: top-down for last-layer sets, a 3D corner view for slot sets. */
export const VIEW: Record<AlgSetId, { view: "top" | "iso"; mask: "full" | "orientation" | "f2l" }> = {
  OLL: { view: "top", mask: "orientation" },
  PLL: { view: "top", mask: "full" },
  COLL: { view: "top", mask: "full" },
  F2L: { view: "iso", mask: "f2l" },
  WV: { view: "iso", mask: "orientation" },
};

export const SET_IDS = ALG_SETS.map((s) => s.id);
