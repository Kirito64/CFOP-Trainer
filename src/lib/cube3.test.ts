import { expect, test } from "bun:test";
import { applyAlg, applyMove, cfopSplits, crossDone, f2lDone, ollDone, SOLVED } from "./cube3";

const face = (f: string, letter: string) => f.slice("URFDLB".indexOf(letter) * 9, "URFDLB".indexOf(letter) * 9 + 9);

test("U moves the front's top row to the left", () => {
  const f = applyMove(SOLVED, "U");
  expect(face(f, "U")).toBe("UUUUUUUUU");
  expect(face(f, "F").slice(0, 3)).toBe("RRR");
  expect(face(f, "L").slice(0, 3)).toBe("FFF");
  expect(face(f, "B").slice(0, 3)).toBe("LLL");
  expect(face(f, "R").slice(0, 3)).toBe("BBB");
});

test("R brings the front's right column up", () => {
  const f = applyMove(SOLVED, "R");
  expect([2, 5, 8].map((i) => face(f, "U")[i]).join("")).toBe("FFF");
  expect([2, 5, 8].map((i) => face(f, "F")[i]).join("")).toBe("DDD");
  // B is drawn from behind, so the stickers next to R are its left column.
  expect([0, 3, 6].map((i) => face(f, "B")[i]).join("")).toBe("UUU");
});

test("every face turn has order four and the sexy move has order six", () => {
  for (const m of "URFDLB") {
    expect(applyAlg(SOLVED, `${m} ${m} ${m} ${m}`)).toBe(SOLVED);
    expect(applyAlg(SOLVED, `${m} ${m}'`)).toBe(SOLVED);
    expect(applyAlg(SOLVED, `${m}2 ${m}2`)).toBe(SOLVED);
  }
  const sexy = "R U R' U'";
  expect(applyAlg(SOLVED, Array(6).fill(sexy).join(" "))).toBe(SOLVED);
  expect(applyAlg(SOLVED, Array(3).fill(sexy).join(" "))).not.toBe(SOLVED);
});

test("T perm swaps two edges and two corners and leaves F2L alone", () => {
  const f = applyAlg(SOLVED, "R U R' U' R' F R2 U' R' U' R U R' F'");
  expect(f).not.toBe(SOLVED);
  expect(f2lDone(f, "D")).toBe(true);
  expect(ollDone(f, "D")).toBe(true);
  expect(applyAlg(f, "R U R' U' R' F R2 U' R' U' R U R' F'")).toBe(SOLVED);
});

test("stage checks follow the cross side", () => {
  const sune = applyAlg(SOLVED, "R U R' U R U2 R'");
  expect(crossDone(sune, "D")).toBe(true);
  expect(f2lDone(sune, "D")).toBe(true);
  expect(ollDone(sune, "D")).toBe(false);
  // Seen from the U side, the same cube has its cross broken.
  expect(crossDone(sune, "U")).toBe(false);
});

test("splits come from the moves that finish each stage", () => {
  // F2 fixes the cross, R U R' the last pair, then an anti-Sune orients and a T perm finishes.
  const solve = ["F2", "R", "U", "R'", ...invert("R U R' U R U2 R'"), ...invert("R U R' U' R' F R2 U' R' U' R U R' F'")];
  const start = applyAlg(SOLVED, invert(solve.join(" ")).join(" "));
  const moves = solve.map((move, i) => ({ move, t: (i + 1) * 100 }));
  const result = cfopSplits(start, moves)!;
  expect(result.face).toBe("D");
  expect(result.splits).toEqual([100, 400, 400 + 7 * 100]);
});

test("no splits when the cube isn't solved at the end", () => {
  expect(cfopSplits(applyMove(SOLVED, "R"), [{ move: "U", t: 100 }])).toBe(null);
});

function invert(alg: string): string[] {
  return alg
    .split(" ")
    .reverse()
    .map((m) => (m.endsWith("'") ? m[0] : m.endsWith("2") ? m : `${m}'`));
}
