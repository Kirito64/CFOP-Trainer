import { expect, test } from "bun:test";
import sets from "../data/algsets.json";
import type { AlgSetDef } from "../data/types";
import { f2lSolved, llOriented, restOfF2lSolved } from "./cases";
import { applyAlg, normalise, solved } from "./cube";
import { scrambleForCase, setupFor } from "./scramble";

const data = sets as AlgSetDef[];
const algs = (id: string) => data.find((s) => s.id === id)!.cases.map((c) => c.algs[0]);
const noise = { pll: algs("PLL"), oll: algs("OLL") };

test("setups give the right kind of state", () => {
  for (let i = 0; i < 50; i++) {
    const oll = normalise(applyAlg(solved(), setupFor({ set: "OLL", alg: algs("OLL")[i % 57], noise })));
    expect(f2lSolved(oll)).toBe(true);
    const pll = normalise(applyAlg(solved(), setupFor({ set: "PLL", alg: algs("PLL")[i % 21], noise })));
    expect(f2lSolved(pll) && llOriented(pll)).toBe(true);
    const f2l = normalise(applyAlg(solved(), setupFor({ set: "F2L", alg: algs("F2L")[i % 41], noise })));
    expect(restOfF2lSolved(f2l, "FR")).toBe(true);
  }
});

test("solver scrambles reproduce the case state", async () => {
  for (const [set, alg] of [["OLL", "R U2 R2 F R F' U2 R' F R F'"], ["PLL", "M2 U M2 U2 M2 U M2"], ["F2L", "R U R'"]] as const) {
    const { scramble, state } = await scrambleForCase({ set, alg, noise });
    expect(scramble.split(" ").length).toBeGreaterThan(4);
    expect(/[MESxyzrludfb]/.test(scramble)).toBe(false);
    expect(normalise(applyAlg(solved(), scramble))).toEqual(state);
  }
}, 60_000);
