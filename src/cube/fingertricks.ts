import { type Move, parseAlg } from "./cube";

// Standard CFOP fingertricks from a home grip (thumbs on F, fingers on B), following the
// community conventions in research/f2l-advanced.md §8 and research/oll-pll-notes.md §5:
// R/L are wrist turns, U is the right index, U' the left index, D the left ring finger,
// D' the right ring finger, M/M' the left ring finger. A wrist reaches two quarter turns from
// home either way, so a third turn the same way becomes a regrip. Moves with no common default are flagged.

export type Hand = "right" | "left" | "both";

export interface Fingertrick {
  move: string;
  hand: Hand;
  how: string;
  /** Set when the hand has to regrip before this move. */
  regrip?: string;
  /** No widely used default exists; the user should pick their own. */
  unsure?: boolean;
  /** Can be done at the same time as the previous move (U and D pinches). */
  withPrevious?: boolean;
}

const name = ({ letter, turns }: Move) => letter + (turns === 2 || turns === -2 ? "2" : turns < 0 ? "'" : "");

const ROTATION: Record<string, [string, string, string]> = {
  x: ["Tilt the cube up, like R", "Tilt the cube down, like R'", "Turn the cube over (x2)"],
  y: ["Turn the cube left, like U", "Turn the cube right, like U'", "Turn the cube around (y2)"],
  z: ["Roll the cube right, like F", "Roll the cube left, like F'", "Roll the cube upside down (z2)"],
};

export function fingertricks(alg: string): Fingertrick[] {
  // Wrist positions in quarter turns from home: R/r and L/l move them, regrips reset them.
  let right = 0;
  let left = 0;
  const out: Fingertrick[] = [];
  let prev: Move | undefined;

  for (const m of parseAlg(alg)) {
    const move = name(m);
    const t = ((m.turns % 4) + 4) % 4; // 1, 2 or 3 (= prime)
    const trick = (hand: Hand, how: string, extra: Partial<Fingertrick> = {}): Fingertrick => ({ move, hand, how, ...extra });
    let ft: Fingertrick;

    switch (m.letter) {
      case "R":
      case "r": {
        const wide = m.letter === "r" ? " (wide)" : "";
        const step = t === 2 ? (right > 0 ? -2 : 2) : t === 1 ? 1 : -1;
        const regrip = Math.abs(right + step) > 2;
        if (regrip) right = 0;
        right += step;
        const how = t === 2 ? `Right wrist double turn${wide}` : `Right wrist ${t === 1 ? "up" : "down"}${wide}`;
        ft = trick("right", how, regrip ? { regrip: "Bring the right hand back to home grip" } : {});
        break;
      }
      case "L":
      case "l": {
        const wide = m.letter === "l" ? " (wide)" : "";
        const step = t === 2 ? (left > 0 ? -2 : 2) : t === 1 ? 1 : -1;
        const regrip = Math.abs(left + step) > 2;
        if (regrip) left = 0;
        left += step;
        const how = t === 2 ? `Left wrist double turn${wide}` : `Left wrist ${t === 1 ? "down" : "up"}${wide}`;
        ft = trick("left", how, regrip ? { regrip: "Bring the left hand back to home grip" } : {});
        break;
      }
      case "U":
      case "u": {
        const wide = m.letter === "u" ? { unsure: true } : {};
        // After a double wrist turn the right index can't reach U.
        const rightFree = Math.abs(right) <= 1;
        if (t === 1) {
          ft = rightFree
            ? trick("right", "Right index push", wide)
            : trick("left", "Left index pull", { unsure: true });
        } else if (t === 3) {
          ft = left === 0 ? trick("left", "Left index push", wide) : trick("right", "Right index pull", wide);
        } else {
          ft = rightFree ? trick("right", "Right index + middle double flick", wide) : trick("left", "Left index + middle double flick", wide);
        }
        break;
      }
      case "D":
      case "d": {
        const wide = m.letter === "d" ? { unsure: true } : {};
        ft =
          t === 1
            ? trick("left", "Left ring finger pull", wide)
            : t === 3
              ? trick("right", "Right ring finger pull", wide)
              : trick("left", "Left ring + middle double flick", wide);
        break;
      }
      case "F":
      case "f": {
        const wide = m.letter === "f" ? " (wide)" : "";
        if (t === 1)
          ft = right === -1 ? trick("right", `Right index push${wide}`) : trick("right", `Right index push, thumb under the cube${wide}`);
        else if (t === 3) ft = trick("right", `Right thumb push${wide}`);
        else ft = trick("right", `Right index double push${wide}`, { unsure: true });
        break;
      }
      case "B":
      case "b":
        ft =
          t === 1
            ? trick("right", "Right ring finger on the back", { unsure: true })
            : t === 3
              ? trick("left", "Left ring finger on the back", { unsure: true })
              : trick("right", "Right ring + middle double flick on the back", { unsure: true });
        break;
      case "M":
        ft =
          t === 3
            ? trick("left", "Left ring finger push (up the back)")
            : t === 1
              ? trick("left", "Left ring finger pull (down the back)")
              : trick("left", "Left ring + middle double flick");
        break;
      case "E":
      case "S":
        ft = trick("both", "Regrip and use a finger on the slice", { unsure: true });
        break;
      default: {
        const r = ROTATION[m.letter];
        ft = trick("both", r ? r[t === 1 ? 0 : t === 3 ? 1 : 2] : "Rotation");
        right = 0;
        left = 0;
      }
    }

    // A U layer and a D layer turn can be pinched together.
    const ud = (x?: Move) => !!x && "UuDd".includes(x.letter);
    if (ud(prev) && ud(m) && prev!.letter.toUpperCase() !== m.letter.toUpperCase()) ft.withPrevious = true;
    out.push(ft);
    prev = m;
  }
  return out;
}

/** Standard choices offered when editing a move's fingertrick. */
export const FINGERTRICK_OPTIONS = [
  "Right wrist up",
  "Right wrist down",
  "Right wrist double turn",
  "Left wrist up",
  "Left wrist down",
  "Left wrist double turn",
  "Right index push",
  "Right index pull",
  "Left index push",
  "Left index pull",
  "Right index + middle double flick",
  "Left index + middle double flick",
  "Right thumb push",
  "Left thumb push",
  "Right index push, thumb under the cube",
  "Left ring finger pull",
  "Right ring finger pull",
  "Left ring finger push (up the back)",
  "Left ring finger pull (down the back)",
  "Left ring + middle double flick",
  "Regrip",
];

/** Which hand a typed fingertrick uses, read from its wording. */
export function handOf(how: string): Hand {
  const s = how.toLowerCase();
  const r = s.includes("right");
  const l = s.includes("left");
  return r && !l ? "right" : l && !r ? "left" : "both";
}
