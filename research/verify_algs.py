"""Simulate every algorithm in the research JSON files and check it is a valid
solution for its case.

Each alg's case is defined as inverse(alg) applied to a solved cube. We then
check the case is the right *kind* of state (e.g. OLL: F2L intact) and that all
algs listed under one case id produce the same case (up to AUF / recolouring),
and that different ids are different cases.

Usage: python3 -I verify_algs.py <research_dir>
"""

import itertools
import json
import re
import sys
from pathlib import Path

# Axes: x -> R, y -> U, z -> F.  Positive angle = counter-clockwise looking
# from the positive end of the axis, so a clockwise face turn on +side is -1.
AXIS = {"x": 0, "y": 1, "z": 2}
# move letter -> (axis, quarter turns (clockwise from that face = -1 on + side), layer predicate)
MOVES = {
    "R": ("x", -1, lambda c: c == 1),
    "L": ("x", 1, lambda c: c == -1),
    "M": ("x", 1, lambda c: c == 0),
    "r": ("x", -1, lambda c: c >= 0),
    "l": ("x", 1, lambda c: c <= 0),
    "x": ("x", -1, lambda c: True),
    "U": ("y", -1, lambda c: c == 1),
    "D": ("y", 1, lambda c: c == -1),
    "E": ("y", 1, lambda c: c == 0),
    "u": ("y", -1, lambda c: c >= 0),
    "d": ("y", 1, lambda c: c <= 0),
    "y": ("y", -1, lambda c: True),
    "F": ("z", -1, lambda c: c == 1),
    "B": ("z", 1, lambda c: c == -1),
    "S": ("z", -1, lambda c: c == 0),
    "f": ("z", -1, lambda c: c >= 0),
    "b": ("z", 1, lambda c: c <= 0),
    "z": ("z", -1, lambda c: True),
}

FACES = {(1, 0, 0): "R", (-1, 0, 0): "L", (0, 1, 0): "U", (0, -1, 0): "D", (0, 0, 1): "F", (0, 0, -1): "B"}
SIDES = ["F", "R", "B", "L"]  # order going around U clockwise seen from top


def rot(v, axis, q):
    x, y, z = v
    for _ in range(q % 4):  # one +90 (CCW) turn about axis
        if axis == 0:
            y, z = -z, y
        elif axis == 1:
            z, x = -x, z
        else:
            x, y = -y, x
    return (x, y, z)


def solved():
    st = {}
    for pos in itertools.product((-1, 0, 1), repeat=3):
        for i in range(3):
            if pos[i]:
                n = tuple(pos[i] if j == i else 0 for j in range(3))
                st[(pos, n)] = FACES[n]
    return st


TOKEN = re.compile(r"([RLUDFBMESrludfbxyz])(w?)(\d*)(['’]?)(\d*)")


def parse(alg):
    s = re.sub(r"[()\[\],]", " ", alg)
    out = []
    for tok in s.split():
        m = TOKEN.fullmatch(tok)
        if not m:
            raise ValueError(f"bad token {tok!r} in {alg!r}")
        letter, wide, n1, prime, n2 = m.groups()
        if wide:
            letter = letter.lower()
        n = int(n1 or n2 or 1)
        out.append((letter, -n if prime else n))
    return out


def invert(moves):
    return [(l, -n) for l, n in reversed(moves)]


def apply(st, moves):
    for letter, n in moves:
        axis, q, pred = MOVES[letter]
        a = AXIS[axis]
        new = {}
        for (pos, nrm), col in st.items():
            if pred(pos[a]):
                new[(rot(pos, a, q * n), rot(nrm, a, q * n))] = col
            else:
                new[(pos, nrm)] = col
        st = new
    return st


ORIENTS = [[(a, n), (b, m)] for a, n in [("x", 0), ("x", 1), ("x", 2), ("x", 3), ("z", 1), ("z", 3)] for b, m in [("y", k) for k in range(4)]]


def centre_colour(st, face):
    n = next(k for k, v in FACES.items() if v == face)
    return st[(n, n)]


def normalise(st):
    """Rotate the whole cube so every centre is back home."""
    for o in ORIENTS:
        s2 = apply(st, o)
        if all(centre_colour(s2, f) == f for f in FACES.values()):
            return s2
    raise AssertionError("no orientation restores centres")


def piece_ok(st, pos):
    return all(st[(p, n)] == FACES[n] for (p, n) in st if p == pos)


CROSS = [(0, -1, 1), (1, -1, 0), (0, -1, -1), (-1, -1, 0), (0, -1, 0)]
SLOTS = {
    "FR": [(1, -1, 1), (1, 0, 1)],
    "FL": [(-1, -1, 1), (-1, 0, 1)],
    "BR": [(1, -1, -1), (1, 0, -1)],
    "BL": [(-1, -1, -1), (-1, 0, -1)],
}
F2L = CROSS + [p for ps in SLOTS.values() for p in ps]
LL_STICKERS = sorted(k for k in solved() if k[0][1] == 1 and k[1] != (0, 0, 0))
LL_EDGES = [(0, 1, 1), (1, 1, 0), (0, 1, -1), (-1, 1, 0)]


def rel(st, key):
    """Colour of a sticker relative to the face it sits on (recolouring-invariant)."""
    col = st[key]
    face = FACES[key[1]]
    if col == "U":
        return "U"
    if col == "D":
        return "D"
    if face in SIDES and col in SIDES:
        return str((SIDES.index(col) - SIDES.index(face)) % 4)
    return col + face  # U-face sticker that isn't U colour


def ll_sig(st, mask_only=False):
    return tuple(("1" if st[k] == "U" else "0") if mask_only else rel(st, k) for k in LL_STICKERS)


def net_rotation(moves):
    """Whole-cube rotation an alg leaves behind (e.g. an A-perm without its final x')."""
    st = apply(solved(), moves)
    for o in ORIENTS:
        s2 = apply(st, o)
        if all(centre_colour(s2, f) == f for f in FACES.values()):
            return invert(o)
    raise AssertionError("no orientation restores centres")


def case_state(alg, pre=0, post=0):
    # alg(case) = solved cube held in the alg's final orientation, so
    # case = inverse(alg) applied to that rotated solved cube.
    moves = parse(alg)
    moves = [("U", pre)] + net_rotation(moves) + invert(moves) + [("U", post)]
    return normalise(apply(solved(), moves))


def check_oll(alg):
    st = case_state(alg)
    errs = [] if all(piece_ok(st, p) for p in F2L) else ["breaks F2L"]
    sig = min(ll_sig(case_state(alg, 0, a), mask_only=True) for a in range(4))
    return errs, sig


def check_pll(alg):
    st = case_state(alg)
    errs = [] if all(piece_ok(st, p) for p in F2L) else ["breaks F2L"]
    if any(st[k] != "U" for k in LL_STICKERS if k[1] == (0, 1, 0)):
        errs.append("changes LL orientation")
    sig = min(ll_sig(case_state(alg, a, b)) for a in range(4) for b in range(4))
    return errs, sig


FR_PAIR = ({"F", "R", "D"}, {"F", "R"})


def pair_sig(st):
    """Where the FR corner and edge stickers are."""
    cubies = {}
    for (p, n), c in st.items():
        cubies.setdefault(p, []).append(((p, n), c))
    return tuple(sorted(x for stickers in cubies.values()
                        if {c for _, c in stickers} in FR_PAIR for x in stickers))


def check_f2l(alg, slot="FR"):
    if any(l in "xyz" for l, _ in parse(alg)):
        return ["contains a cube rotation"], None
    st = case_state(alg)
    errs = []
    keep = CROSS + [p for s, ps in SLOTS.items() if s != slot for p in ps]
    if not all(piece_ok(st, p) for p in keep):
        errs.append("disturbs cross or another slot")
    if all(piece_ok(st, p) for p in SLOTS[slot]):
        errs.append("case has the pair already solved")
    return errs, min(pair_sig(case_state(alg, 0, a)) for a in range(4))


def check_coll(alg):
    st = case_state(alg)
    errs = [] if all(piece_ok(st, p) for p in F2L) else ["breaks F2L"]
    for e in LL_EDGES:
        if st[(e, (0, 1, 0))] != "U":
            errs.append("LL edges not oriented in case")
            break
    corners = [k for k in LL_STICKERS if sum(map(abs, k[0])) == 3]
    sig = min(tuple(rel(case_state(alg, a, b), k) for k in corners) for a in range(4) for b in range(4))
    return errs, sig


def check_wv(alg):
    errs, _ = check_f2l(alg)
    if errs:
        return errs, None
    st = case_state(alg)
    # LL edges must be oriented; the pair's own edge (no U sticker) may sit in the U layer
    for e in LL_EDGES:
        if "U" in {c for (p, _), c in st.items() if p == e} and st[(e, (0, 1, 0))] != "U":
            errs.append("LL edges not oriented in case")
            break
    # WV cases differ by corner orientation too, so include the U-colour mask
    return errs, min((pair_sig(case_state(alg, 0, a)), ll_sig(case_state(alg, 0, a), mask_only=True))
                     for a in range(4))


CHECKS = {"oll.json": check_oll, "pll.json": check_pll, "f2l.json": check_f2l, "coll.json": check_coll, "wv.json": check_wv}


def main(d):
    d = Path(d)
    report = {}
    for fname, check in CHECKS.items():
        f = d / fname
        if not f.exists():
            continue
        data = json.loads(f.read_text())
        bad, case_sigs, total = [], {}, 0
        for case in data["cases"]:
            sigs = set()
            for alg in case.get("algs", []):
                total += 1
                try:
                    errs, sig = check(alg)
                except Exception as e:  # unparsable
                    errs, sig = [str(e)], None
                if errs:
                    bad.append({"case": case["id"], "alg": alg, "errors": errs})
                elif sig is not None:
                    sigs.add(sig)
            if len(sigs) > 1:
                bad.append({"case": case["id"], "alg": "*", "errors": [f"algs solve {len(sigs)} different cases"]})
            if sigs:
                case_sigs[case["id"]] = sigs
        # duplicate cases across ids
        seen = {}
        dupes = []
        for cid, sigs in case_sigs.items():
            for s in sigs:
                if s in seen and seen[s] != cid:
                    dupes.append([seen[s], cid])
                seen.setdefault(s, cid)
        report[fname] = {"cases": len(data["cases"]), "algs": total, "failures": bad,
                         "duplicate_cases": dupes, "distinct_cases": len(seen)}
        print(f"{fname}: {len(data['cases'])} cases, {total} algs, {len(bad)} failures, "
              f"{len(seen)} distinct cases, {len(dupes)} duplicate-case pairs")
        for b in bad:
            print(f"   ✗ {b['case']}: {b['alg']}  -> {', '.join(b['errors'])}")
        for a, b in dupes:
            print(f"   ⚠ {a} and {b} are the same case")
    (d / "verification-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1])
