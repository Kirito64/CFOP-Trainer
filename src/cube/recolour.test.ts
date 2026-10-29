import { expect, test } from "bun:test";
import { caseState } from "./cube";
import { recolour, validPreAufs } from "./recolour";

const T = "R U R' U' R' F R2 U' R' U' R U R' F'";
const H = "M2 U M2 U2 M2 U M2";

test("pre-AUF is the inverse of the post-AUF used to build the case", () => {
  expect(validPreAufs(caseState(T), T)).toEqual([""]);
  expect(validPreAufs(caseState(T, { postAuf: 1 }), T)).toEqual(["U'"]);
  expect(validPreAufs(caseState(T, { postAuf: 2, preAuf: 3 }), T)).toEqual(["U2"]);
});

test("symmetric cases accept several pre-AUFs", () => {
  expect(validPreAufs(caseState(H), H)).toEqual(["", "U", "U2", "U'"]);
});

test("recolouring by 4 is the identity", () => {
  const s = caseState(T);
  expect(recolour(s, 4)).toEqual(s);
  expect(recolour(s, 1)).not.toEqual(s);
});
