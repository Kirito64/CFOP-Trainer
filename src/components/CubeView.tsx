import { at, type CubeState, type Face, PIECE_OF, STICKERS, type Vec } from "../cube/cube";

export const STICKER_COLOURS: Record<Face, string> = {
  U: "#FFD500",
  D: "#FFFFFF",
  F: "#00A050",
  B: "#0A4FC4",
  R: "#FF6A13",
  L: "#C8102E",
};

export type Mask = "full" | "orientation" | "f2l";

/** Fill for sticker i under a mask. Greying works by piece: a piece that still belongs to the last layer is "not yet relevant". */
function fill(state: CubeState, i: number, mask: Mask): string {
  const c = state[i];
  if (mask === "full") return STICKER_COLOURS[c];
  const isLastLayerPiece = PIECE_OF[i].some((j) => state[j] === "U");
  if (!isLastLayerPiece) return STICKER_COLOURS[c];
  if (mask === "orientation" && c === "U") return STICKER_COLOURS.U;
  return "var(--grey-sticker)";
}

interface Props {
  state: CubeState;
  mask?: Mask;
  size?: number;
  className?: string;
  title?: string;
}

/** Top-down last-layer diagram with the side stickers folded out around the edge. */
export function TopView({ state, mask = "full", size = 120, className, title }: Props) {
  const u = 10; // sticker pitch
  const side = 3.2; // depth of the folded-out side stickers
  const gap = 0.9;
  const o = side + gap; // origin of the U face
  const total = 3 * u + 2 * o;
  const rect = (x: number, y: number, w: number, h: number, i: number) => (
    <rect key={i} x={x + 0.45} y={y + 0.45} width={w - 0.9} height={h - 0.9} rx={1.3} fill={fill(state, i, mask)} />
  );
  const stickers = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) stickers.push(rect(o + c * u, o + r * u, u, u, at("U", r, c)));
  for (let k = 0; k < 3; k++) {
    stickers.push(rect(o + k * u, 0, u, side, at("B", 0, 2 - k)));
    stickers.push(rect(o + k * u, o + 3 * u + gap, u, side, at("F", 0, k)));
    stickers.push(rect(0, o + k * u, side, u, at("L", 0, k)));
    stickers.push(rect(o + 3 * u + gap, o + k * u, side, u, at("R", 0, 2 - k)));
  }
  return (
    <svg viewBox={`-0.5 -0.5 ${total + 1} ${total + 1}`} width={size} height={size} className={className} role="img" aria-label={title}>
      {title && <title>{title}</title>}
      <rect x={o - 0.3} y={o - 0.3} width={3 * u + 0.6} height={3 * u + 0.6} rx={2} fill="var(--plastic)" />
      {stickers}
    </svg>
  );
}

// Isometric-ish projection that shows the U, F and R faces, slightly favouring the front.
const COS = Math.cos(Math.PI / 6);
const project = ([x, y, z]: Vec): [number, number] => [(x - z * 0.92) * COS, -y + (x * 0.92 + z) * 0.56];

const FACE_AXES: Partial<Record<Face, [Vec, Vec]>> = {
  U: [[1, 0, 0], [0, 0, -1]],
  F: [[1, 0, 0], [0, 1, 0]],
  R: [[0, 0, -1], [0, 1, 0]],
};

/** 3D corner view of the U, F and R faces, used for F2L/last-slot cases and two-sided PLL recognition. */
export function IsoView({ state, mask = "full", size = 120, className, title }: Props) {
  const polys = STICKERS.flatMap((s, i) => {
    const face = (["U", "R", "F"] as Face[]).find((f) => i >= at(f, 0, 0) && i <= at(f, 2, 2));
    if (!face) return [];
    const [right, up] = FACE_AXES[face]!;
    const centre = s.pos.map((p, k) => p + s.normal[k] * 0.5);
    const corner = (a: number, b: number): Vec => centre.map((p, k) => p + right[k] * a + up[k] * b) as unknown as Vec;
    const h = 0.44;
    const pts = [corner(-h, -h), corner(h, -h), corner(h, h), corner(-h, h)].map(project);
    return [<polygon key={i} points={pts.map((p) => p.join(",")).join(" ")} fill={fill(state, i, mask)} strokeLinejoin="round" />];
  });
  const hull = ([[-1.5, -1.5, 1.5], [-1.5, 1.5, 1.5], [-1.5, 1.5, -1.5], [1.5, 1.5, -1.5], [1.5, -1.5, -1.5], [1.5, -1.5, 1.5]] as Vec[]).map(project);
  const xs = hull.map((p) => p[0]);
  const ys = hull.map((p) => p[1]);
  const pad = 0.12;
  const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];
  return (
    <svg viewBox={vb.join(" ")} width={size} height={size} className={className} role="img" aria-label={title}>
      {title && <title>{title}</title>}
      <polygon points={hull.map((p) => p.join(",")).join(" ")} fill="var(--plastic)" stroke="var(--plastic)" strokeWidth={0.08} strokeLinejoin="round" />
      {polys}
    </svg>
  );
}

export function CaseView({ view, ...props }: Props & { view: "top" | "iso" }) {
  return view === "top" ? <TopView {...props} /> : <IsoView {...props} />;
}
