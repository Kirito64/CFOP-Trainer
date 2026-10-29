import { describe, expect, test } from "bun:test";
import sets from "../data/algsets.json";
import type { AlgSetDef } from "../data/types";
import { parseAlg } from "./cube";
import { fingertricks, handOf } from "./fingertricks";

const data = sets as AlgSetDef[];
const hows = (alg: string) => fingertricks(alg).map((f) => f.how);

describe("fingertricks", () => {
  test("Sune is all right hand with no regrip", () => {
    expect(hows("R U R' U R U2 R'")).toEqual([
      "Right wrist up",
      "Right index push",
      "Right wrist down",
      "Right index push",
      "Right wrist up",
      "Right index + middle double flick",
      "Right wrist down",
    ]);
    expect(fingertricks("R U R' U R U2 R'").some((f) => f.regrip || f.unsure)).toBe(false);
  });

  test("U' uses the left index", () => {
    expect(hows("R U' R'")[1]).toBe("Left index push");
  });

  test("T perm: R' F is a right index push and the last F' a right thumb", () => {
    const t = fingertricks("R U R' U' R' F R2 U' R' U' R U R' F'");
    expect(t[5].how).toBe("Right index push");
    expect(t[13].how).toBe("Right thumb push");
    expect(t.some((f) => f.regrip)).toBe(false);
  });

  test("a third wrist turn the same way needs a regrip", () => {
    const t = fingertricks("R U R U R");
    expect(t[2].regrip).toBeUndefined();
    expect(t[4].regrip).toBeDefined();
  });

  test("D and U next to each other can be pinched", () => {
    const t = fingertricks("R2 U R' U R' U' R U' R2 D U' R' U R D'");
    expect(t[10].move).toBe("U'");
    expect(t[10].withPrevious).toBe(true);
    expect(t[9].withPrevious).toBeUndefined();
  });

  test("rotations are labelled and reset the grip", () => {
    const t = fingertricks("R R x R");
    expect(t[2].hand).toBe("both");
    expect(t[3].regrip).toBeUndefined();
  });

  test("every shipped alg gets one fingertrick per move", () => {
    let moves = 0;
    let unsure = 0;
    for (const set of data)
      for (const c of set.cases)
        for (const alg of c.algs) {
          const t = fingertricks(alg);
          expect(t.length).toBe(parseAlg(alg).length);
          moves += t.length;
          unsure += t.filter((f) => f.unsure).length;
        }
    // Most moves should have a standard trick; flagged ones are the exception.
    expect(unsure / moves).toBeLessThan(0.05);
  });

  test("handOf reads the hand from the wording", () => {
    expect(handOf("Right index push")).toBe("right");
    expect(handOf("left ring finger pull")).toBe("left");
    expect(handOf("Regrip")).toBe("both");
  });
});
