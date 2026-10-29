import { expect, test } from "bun:test";
import { applyAlg, at, solved } from "./cube";
import { crossLength, optimalCross, toSolvingFrame } from "./cross";

const crossSolved = (scramble: string, solution: string) => {
  const s = applyAlg(applyAlg(solved(), scramble), solution);
  return [at("D", 0, 1), at("D", 1, 0), at("D", 1, 2), at("D", 2, 1)].every((i) => s[i] === "D") &&
    [at("F", 2, 1), at("R", 2, 1), at("B", 2, 1), at("L", 2, 1)].every((i) => s[i] === ["F", "R", "B", "L"][[at("F", 2, 1), at("R", 2, 1), at("B", 2, 1), at("L", 2, 1)].indexOf(i)]);
};

test("solved cross is 0 moves", () => {
  expect(crossLength("")).toBe(0);
  expect(crossLength("R U R' U'")).toBe(0);
});

test("simple cases", () => {
  expect(crossLength("F")).toBe(1);
  expect(crossLength("F R")).toBe(2);
  expect(crossLength("D")).toBe(1);
});

test("optimal solutions actually solve the cross", () => {
  for (const scr of ["R2 D' F2 U L' B R2 F' D2 U2 L2", "F R U' L B2 D' R2 F2 L' U2 B", "D2 L' F R' B U2 R F D' L2 B'"]) {
    const sol = optimalCross(scr);
    expect(sol.split(" ").filter(Boolean).length).toBe(crossLength(scr));
    expect(crossSolved(scr, sol)).toBe(true);
    expect(crossLength(scr)).toBeLessThanOrEqual(8);
  }
});

test("white-top scrambles are relabelled for white-bottom solving", () => {
  expect(toSolvingFrame("U R' D2 L F B'")).toBe("D L' U2 R F B'");
});
