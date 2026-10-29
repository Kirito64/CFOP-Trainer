import { describe, expect, test } from "bun:test";
import sets from "../data/algsets.json";
import type { AlgSetDef } from "../data/types";
import {
  f2lSolved,
  llEdgesOriented,
  llOriented,
  llSignature,
  pairSignature,
  restOfF2lSolved,
  slotSolved,
} from "./cases";
import { applyAlg, caseState, invertAlg, isSolved, mirrorAlg, parseAlg, solved } from "./cube";

const data = sets as AlgSetDef[];

describe("cube model", () => {
  test("move conventions", () => {
    const same = (a: string, b: string) => expect(caseState(a)).toEqual(caseState(b));
    same("x U x'", "F");
    same("y R y'", "B");
    same("z U z'", "L");
    same("r", "R M'");
    same("Rw", "r");
    same("u", "U E'");
    same("f", "F S");
  });

  test("an alg followed by its inverse is solved", () => {
    const alg = "R U R' U' r' F R F' M2 S E2 x y z2 d b' l2";
    expect(isSolved(applyAlg(applyAlg(solved(), alg), invertAlg(alg)))).toBe(true);
  });

  test("sexy move has order 6", () => {
    expect(isSolved(applyAlg(solved(), "R U R' U' ".repeat(6)))).toBe(true);
    expect(isSolved(applyAlg(solved(), "R U R' U' ".repeat(3)))).toBe(false);
  });

  test("parses the notation variants found in sources", () => {
    expect(parseAlg("(R U2' R')").map((m) => m.turns)).toEqual([1, -2, -1]);
    expect(parseAlg("R2'")[0].turns).toBe(-2);
    expect(parseAlg("Lw'")[0]).toEqual({ letter: "l", turns: -1 });
  });
});

const set = (id: string) => data.find((s) => s.id === id)!;

function expectDistinct(id: string, sig: (alg: string) => string) {
  const owner = new Map<string, string>();
  for (const c of set(id).cases) {
    const sigs = new Set(c.algs.map(sig));
    expect(sigs.size, `${c.id}: algs solve different cases`).toBe(1);
    const s = [...sigs][0];
    expect(owner.get(s), `${c.id} duplicates ${owner.get(s)}`).toBeUndefined();
    owner.set(s, c.id);
  }
}

describe("shipped alg data", () => {
  test("every OLL alg keeps F2L and orients the last layer", () => {
    for (const c of set("OLL").cases) for (const a of c.algs) expect(f2lSolved(caseState(a)), `${c.id}: ${a}`).toBe(true);
    expectDistinct("OLL", (a) => llSignature(a, "orientation"));
  });

  test("every PLL alg keeps F2L and orientation", () => {
    for (const c of set("PLL").cases)
      for (const a of c.algs) {
        const s = caseState(a);
        expect(f2lSolved(s) && llOriented(s), `${c.id}: ${a}`).toBe(true);
      }
    expectDistinct("PLL", (a) => llSignature(a, "full"));
  });

  test("every COLL alg solves corners from an edges-oriented state", () => {
    for (const c of set("COLL").cases)
      for (const a of c.algs) {
        const s = caseState(a);
        expect(f2lSolved(s) && llEdgesOriented(s), `${c.id}: ${a}`).toBe(true);
      }
    expectDistinct("COLL", (a) => llSignature(a, "corners"));
  });

  test("every F2L alg solves its front-right pair without rotations", () => {
    for (const c of set("F2L").cases)
      for (const a of c.algs) {
        expect(/[xyz]/.test(a), `${c.id}: ${a} has a rotation`).toBe(false);
        const s = caseState(a);
        expect(restOfF2lSolved(s, "FR") && !slotSolved(s, "FR"), `${c.id}: ${a}`).toBe(true);
      }
    expectDistinct("F2L", (a) => pairSignature(a));
  });

  test("mirrored F2L algs solve the front-left slot", () => {
    for (const c of set("F2L").cases)
      for (const a of c.algs) expect(restOfF2lSolved(caseState(mirrorAlg(a)), "FL"), `${c.id}: ${a}`).toBe(true);
  });

  test("every WV alg inserts the pair and leaves corners oriented", () => {
    for (const c of set("WV").cases)
      for (const a of c.algs) {
        const s = caseState(a);
        expect(restOfF2lSolved(s, "FR") && llEdgesOriented(s), `${c.id}: ${a}`).toBe(true);
      }
    expectDistinct("WV", (a) => pairSignature(a) + llSignature(a, "orientation"));
  });
});
