import { type CubeState, type Face, applyAlg, isSolved } from "./cube";

const SIDES: Face[] = ["F", "R", "B", "L"];

/** Repaint the side colours as if the cube were turned `shift` quarter turns about y (a different front colour). */
export const recolour = (state: CubeState, shift: number): CubeState =>
  state.map((c) => (SIDES.includes(c) ? SIDES[(SIDES.indexOf(c) + shift) % 4] : c));

const AUF = ["", "U", "U2", "U'"] as const;
export type Auf = (typeof AUF)[number];
export const AUF_LABELS: Record<Auf, string> = { "": "None", U: "U", U2: "U2", "U'": "U'" };

/** Every U turn that, done before `alg`, solves `state` (allowing a final U turn). */
export function validPreAufs(state: CubeState, alg: string): Auf[] {
  return AUF.filter((pre) => AUF.some((post) => isSolved(applyAlg(state, `${pre} ${alg} ${post}`))));
}
