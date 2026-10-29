import { expect, test } from "bun:test";
import { averageOf, bestAverage, median, trimCount } from "./stats";

const DNF = Infinity;

test("ao5 drops best and worst", () => {
  expect(averageOf([10000, 12000, 11000, 15000, 9000], 5)).toBe(11000);
});

test("ao5 with one DNF treats it as the worst", () => {
  expect(averageOf([10000, 12000, DNF, 11000, 9000], 5)).toBe(11000);
});

test("ao5 with two DNFs is a DNF", () => {
  expect(averageOf([10000, DNF, DNF, 11000, 9000], 5)).toBe(DNF);
});

test("mo3 counts every solve and any DNF makes it DNF", () => {
  expect(averageOf([10000, 11000, 12000], 3)).toBe(11000);
  expect(averageOf([10000, DNF, 12000], 3)).toBe(DNF);
});

test("ao12 trims one from each end, ao100 five", () => {
  expect(trimCount(12)).toBe(1);
  expect(trimCount(50)).toBe(3);
  expect(trimCount(100)).toBe(5);
});

test("averages round to hundredths", () => {
  expect(averageOf([10001, 10002, 10004, 1, 99999], 5)).toBe(10000);
  expect(averageOf([10006, 10006, 10006, 1, 99999], 5)).toBe(10010);
});

test("not enough solves gives null", () => {
  expect(averageOf([1, 2, 3, 4], 5)).toBeNull();
});

test("best rolling average", () => {
  expect(bestAverage([20000, 10000, 10000, 10000, 10000, 10000, 30000], 5)).toBe(10000);
});

test("median", () => {
  expect(median([3, 1, 2])).toBe(2);
  expect(median([4, 1, 2, 3])).toBe(2.5);
  expect(median([])).toBeNull();
});
