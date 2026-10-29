// Turns the verified research JSONs into the slimmer dataset the app ships.
// Run with: bun scripts/build-data.ts
import { formatMoves, parseAlg } from "../src/cube/cube";
import type { AlgSetDef, CaseDef } from "../src/data/types";

const root = new URL("..", import.meta.url).pathname;
const read = async (name: string) => Bun.file(`${root}research/${name}.json`).json();

type Raw = Record<string, any>;

const AUF = ["", "U", "U2", "U'"];
/** Fold a pre-AUF into the alg so every alg of a case starts from the same state. */
const withPreAuf = (alg: string, preAuf = 0) => formatMoves(parseAlg(`${AUF[preAuf % 4]} ${alg}`.trim()).reduce(mergeLeadingU, []));

function mergeLeadingU(acc: ReturnType<typeof parseAlg>, m: ReturnType<typeof parseAlg>[number]) {
  const last = acc.at(-1);
  if (last && last.letter === m.letter) {
    acc[acc.length - 1] = { ...last, turns: last.turns + m.turns };
    if ((((last.turns + m.turns) % 4) + 4) % 4 === 0) acc.pop();
  } else acc.push(m);
  return acc;
}

/** Drop notes the research agents wrote for themselves. */
const tidy = (text?: string) =>
  text
    ?.replace(/\s*\(Orientation = [^)]*\)\.?\)?/g, "")
    .replace(/As held for algs\[0\]:?/g, "Held for the main alg:")
    .replace(/\(cube held as for the first alg, after any leading y\)/g, "(held for the main alg)")
    .trim();

const fraction = (p?: string) => {
  if (!p) return undefined;
  const [a, b] = p.split("/").map(Number);
  return b ? a / b : undefined;
};

function cases(raw: Raw, extra: (c: Raw) => Partial<CaseDef> = () => ({})): CaseDef[] {
  return raw.cases.map((c: Raw) => ({
    id: c.id,
    name: c.name ?? c.id,
    group: c.group,
    algs: (c.algs as string[]).map((a, i) => withPreAuf(a, c.pre_auf?.[i] ?? 0)),
    ...(c.recognition ? { recognition: tidy(c.recognition) } : {}),
    ...(fraction(c.probability) ? { probability: fraction(c.probability) } : {}),
    ...extra(c),
  }));
}

const [oll, pll, f2l, coll, wv] = await Promise.all(["oll", "pll", "f2l", "coll", "wv"].map(read));

const sets: AlgSetDef[] = [
  {
    id: "F2L",
    name: "F2L",
    description: "The 41 ways a corner and edge can sit relative to their slot. Algs insert into the front-right slot; the front-left versions are mirrors.",
    cases: cases(f2l, (c) => ({ name: c.id, recognition: tidy(c.description), notes: tidy(c.notes) })),
  },
  {
    id: "OLL",
    name: "OLL",
    description: "Orient the last layer in one look. 57 cases.",
    cases: cases(oll, (c) => ({ twoLook: c.two_look })),
  },
  {
    id: "PLL",
    name: "PLL",
    description: "Permute the last layer. 21 cases.",
    cases: cases(pll, (c) => ({ twoLook: c.two_look })),
  },
  {
    id: "COLL",
    name: "COLL",
    description: "When the edges are oriented, solve the corners and leave only an edge PLL. 42 cases.",
    cases: cases(coll),
  },
  {
    id: "WV",
    name: "Winter Variation",
    description: "Insert the last pair with R U' R' while orienting every last-layer corner. 27 cases, edges must already be oriented.",
    cases: cases(wv),
  },
];

await Bun.write(`${root}src/data/algsets.json`, JSON.stringify(sets, null, 1));
console.log(sets.map((s) => `${s.id}: ${s.cases.length} cases, ${s.cases.reduce((n, c) => n + c.algs.length, 0)} algs`).join("\n"));
