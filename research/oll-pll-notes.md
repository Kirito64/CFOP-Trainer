# OLL / PLL research notes (for the CFOP trainer)

Companion to `oll.json` (57 cases, 226 algs) and `pll.json` (21 cases, 77 algs). Compiled 2026-10-28.

## 0. Where the data came from and how it was checked

**Primary sources**
- J Perm alg pages. The alg data is loaded from the JS files the pages use: https://jperm.net/algs/oll, https://jperm.net/algs/pll (`/lib/oll.js`, `/lib/pll.js`), 2-look at https://jperm.net/algs/2look/oll and https://jperm.net/algs/2look/pll
- SpeedCubeDB category pages, with community vote counts per alg: https://www.speedcubedb.com/a/3x3/OLL and https://www.speedcubedb.com/a/3x3/PLL
- Feliks Zemdegs and Andy Klise, CubeSkills PDFs: https://www.cubeskills.com/uploads/pdf/tutorials/oll-algorithms.pdf and https://www.cubeskills.com/uploads/pdf/tutorials/pll-algorithms.pdf
- Speedsolving wiki, read via Wayback snapshots from Dec 2025 to Feb 2026 because the live wiki sits behind a Cloudflare challenge:
  - https://www.speedsolving.com/wiki/index.php?title=OLL (case nicknames)
  - https://www.speedsolving.com/wiki/index.php?title=PLL
  - https://www.speedsolving.com/wiki/index.php?title=2-Look_OLL
  - https://www.speedsolving.com/wiki/index.php?title=2-Look_PLL
  - https://www.speedsolving.com/wiki/index.php?title=AUF

**How the algs were chosen**
- Every SpeedCubeDB alg and every J Perm alg was collected for each case.
- Duplicates were merged. Two algs count as the same if they differ only in a leading rotation or by merging `R' R'` into `R2`.
- Candidates were ranked by SpeedCubeDB votes, and up to four were kept. J Perm's first alg is always included.
- The most-voted alg goes first. One exception: when the most-voted alg needs a rotation and a rotation-free alg has at least 60% of its votes, the rotation-free alg goes first. This applied to OLL 2, 3, 8, 12, 19, 34, 36, 39, 47, 52 and 55.
- Algs are copied exactly as published, with two changes: parentheses were removed, and some sources write `R2'`, which was treated as `R2`. Algs containing `R3` (one J Perm Ub alg) and an obvious joke T-perm were left out.
- Aa/Ab J Perm variants, the J Perm E algs, J Perm Ja #1, the `z` N-perms and J Perm V #5 all end with the cube rotated, so they were left out. Every alg kept has a net rotation of nothing or `y` only. In the PLL file, the first alg for Aa, Ab, E and Ja uses `x ... x'`-style rotations (the most-voted forms, around 150 to 200 votes each). A rotation-free alternative follows where one exists.

**How it was verified.** A sticker-level cube simulator (helper scripts in the session scratchpad, not part of the deliverable) checked all 303 algs.
- Each alg's case was derived from the solved cube with the alg's net rotation handled correctly. It had to:
  - leave F2L solved,
  - for PLL, keep LL orientation,
  - solve the same case as SpeedCubeDB's setup scramble for that case, allowing for AUF.
- A naive check was also run (apply the inverse alg to a solved cube, then check F2L against the centres), and every alg passes it too.
- Case identity was cross-checked three ways: J Perm algs, SpeedCubeDB setups, and every alg in both CubeSkills PDFs. They agree on all 78 cases.
- The computed `pattern` (top stickers) matches SpeedCubeDB's case images for all 57 OLLs.

**Extra JSON fields** (beyond the requested schema)
- `pattern`: the sticker map of the case as held right before `algs[0]`. It can drive case diagrams directly.
- `mirror_of` / `inverse_of`: computed by simulation.
- `alg_details`: the source and SpeedCubeDB vote count for each alg.
- `two_look_edge_step` in the OLL file and `two_look_steps` in the PLL file: the 2-look algorithms.
- `field_notes`: explains each of these fields.

## 1. OLL recognition

**Look at the edges first, then the corners, then the side stickers.** This is the order the speedsolving wiki and J Perm both group cases in.

1. **Count the oriented edges.** You get one of four shapes: dot (0 edges), L (2 adjacent), line (2 opposite) or cross (4).
2. **Count the oriented corners and look at the shape** this makes on top.
3. **Use the side stickers to pick the exact case.**
   - Headlights: the two U-colour corner stickers are on the same side.
   - Bar: all 3 stickers on a side are U-coloured.
   - Otherwise, note which way the single corner stickers point.

The `recognition` field in `oll.json` gives the top shape and the side-sticker layout for every case, in the orientation for `algs[0]`.

**Shape groups** (J Perm and speedsolving wiki group names; nicknames from the wiki):

| Group | Cases | Notes |
|---|---|---|
| OCLL / Cross (all edges oriented) | 21 H, 22 Pi, 23 U/Headlights, 24 T/Chameleon, 25 L/Bowtie, 26 Anti-Sune, 27 Sune | 2nd look of 2-look OLL |
| Corners oriented (edges only) | 28 Arrow, 57 H/Mummy | |
| T | 33 Key, 45 T | 45 = the 2-look line alg `F R U R' U' F'` |
| P | 31 Couch, 32 Anti-Couch, 43 Anti-P, 44 P | 44 = the 2-look L alg `f R U R' U' f'` |
| C | 34 City, 46 Seein' Headlights | |
| W | 36 Wario, 38 Mario | |
| Square | 5, 6 | Wide Anti-Sune shapes |
| Small lightning bolt | 7, 8, 11, 12 | |
| Big lightning bolt | 39 Fung, 40 Anti-Fung | |
| Fish | 9 Kite, 10 Anti-Kite, 35 Fish Salad, 37 Mounted Fish | |
| Knight move | 13, 14, 15, 16 | |
| Awkward | 29, 30, 41, 42 | |
| Small L | 47, 48, 49, 50, 53, 54 | |
| I / Line | 51, 52, 55 Highway, 56 Streetlights | |
| Dot (no edges) | 1, 2, 3, 4, 17, 18, 19, 20 | 20 (X / Checkers) is the rarest case, at 1/216 |

**Probabilities.** Most OLLs are 1/54. Cases 1, 21, 55, 56 and 57 are 1/108, and 20 is 1/216. The 57 cases sum to 215/216; the remaining 1/216 is the OLL skip.

**Move counts.** The primary algs in `oll.json` average about 9.8 moves (STM, rotations excluded). The speedsolving wiki gives 9.7 HTM for speed-optimised OLL.

## 2. PLL recognition

### Terms

- **Headlights:** the two corner stickers on one side are the same colour.
- **Bar:** a full row of 3 matching stickers on one side.
- **Block:** 2 adjacent matching stickers (corner plus edge).
- **Checker:** two colours alternating.
- **Opposite / adjacent sticker:** whether a sticker's colour is opposite to, or adjacent to, its neighbour's colour on the cube.

### Step 1: corner permutation

From [Sarah Strong's 2-side PLL recognition guide](https://sarah.cubing.net/3x3x3/pll-recognition-guide):

- **Headlights on every side:** the corners are solved, so it is an edges-only PLL (H, Z, Ua, Ub) or a skip.
- **Every side shows a pair of opposite colours:** a diagonal corner swap (E, N, V, Y).
- **Exactly one side has headlights,** or exactly one opposite-colour pair: an adjacent corner swap (A, F, G, J, R, T).

### Step 2: the "bars and blocks" heuristics

These per-case heuristics, as written in `pll.json`, were all checked against the simulated sticker patterns:

| Case | Key feature |
|---|---|
| H | Headlights on all 4 sides; each edge is the opposite colour of its headlights |
| Z | Headlights on all 4 sides; each edge is an adjacent colour |
| Ua / Ub | One solved 3-bar plus headlights on the other 3 sides. Hold the bar at the back: if the front edge matches the right side's headlights it is **Ua**, if it matches the left side's it is **Ub** |
| Aa / Ab | Corners only. Edges solved relative to each other, one set of headlights, and a 1x2x2 block. Hold the headlights at the back: block at front-left is **Aa**, front-right is **Ab** |
| E | No headlights, no blocks; on every side the two corners are opposite colours |
| T | Headlights, plus 2-blocks on **both** adjacent sides touching the headlights; the side opposite the headlights has the headlights colour in its middle |
| R (a/b) | Headlights plus a **single** 2-block on an adjacent side, touching the headlights |
| G (a–d) | Headlights plus a 2-block that does **not** touch the headlights side; no bars |
| J (a/b) | A full 3-bar plus a 2-block touching it: a 1x2x3 block |
| F | A full 3-bar; the opposite side has three colours with opposite-coloured corners; no headlights |
| V | One 1x2x2 block (a corner plus both its edges); the far sides show opposite-coloured corners |
| Y | Two 2-blocks on adjacent sides that don't share a corner; no headlights, no bars |
| Na / Nb | Every side shows a 2-block plus a lone corner. In **Na** the block is on the right of each side as you face it; in **Nb** it is on the left |

### Two-sided recognition

You read only the front and right faces (6 stickers). Sarah Strong's guide splits this into sections:

- **EPLL:** decided by 3x1 blocks, opposite edges and checkers.
- **Diagonal CP:** decided by inside/outside blocks and checkers.
- **Adjacent CP, sections A to E:** split by headlights versus no headlights, and the number of blocks. The case is then decided by:
  - whether a block is "inner" (contains the shared corner between the two visible sides) or "outer",
  - whether the edge between the headlights is opposite or adjacent,
  - whether exactly 3 unique colours are visible.

A few of its rules:
- One 3x1 block on the left: an opposite edge on the right means Ub, an adjacent edge means Ua.
- Diagonal case with two blocks: both inside means V, both outside means Y.
- 3x1 plus a 2x1 block: with the 3x1 on the left, the 2x1 inside means Ja and outside means Jb.

The guide is worth using as the spec for an app's "2-sided recognition" drill mode. Further reading:
- [Cubelelo two-sided PLL article](https://www.cubelelo.com/blogs/cubing/two-sided-pll-recognition)
- [Speedsolving two-sided PLL thread](https://www.speedsolving.com/forum/threads/two-sided-pll-recognition-guide.41108/)

`pll.json` `pattern` stores the 12 side stickers as home-face letters, which is enough to render any view and to generate 2-side quiz images.

**Probabilities.** Most PLLs are 1/18. E and Z are 1/36, and H, Na and Nb are 1/72. The 21 cases sum to 71/72; the remaining 1/72 is the PLL skip.

## 3. 2-look OLL and 2-look PLL

**2-look OLL** (10 algs: 3 for edges, 7 for corners).
- J Perm: https://jperm.net/algs/2look/oll
- Speedsolving wiki: https://www.speedsolving.com/wiki/index.php?title=2-Look_OLL

Step 1, orient the edges:

| Shape | Alg | How to hold it |
|---|---|---|
| Line | `F R U R' U' F'` | Line horizontal. This is the OLL 45 alg |
| L | `f R U R' U' f'` | Simulation: the oriented edges must be at **front + right** for this alg. `F U R U' R' F'` is the form for an L at back + left; J Perm lists the same alg as `y2 F U R U' R' F'` |
| Dot | `F R U R' U' F' f R U R' U' f'` | Any orientation. This is an OLL 2 alg |

Step 2 is OCLL, the seven corner cases 21–27 (`two_look: true` in `oll.json`):
- Sune and Anti-Sune
- H (`R U R' U R U' R' U R U2 R'`)
- Pi (`R U2 R2 U' R2 U' R2 U2 R`)
- U (`R2 D R' U2 R D' R' U2 R'`)
- T (`r U R' U' r' F R F'`)
- L/Bowtie (`F R' F' r U R U' r'` on J Perm's 2-look page)

The wiki notes that T, Bowtie and Headlights can each be done as a Sune and an Anti-Sune with a U move between them, and H as two Sunes.

**2-look PLL** (6 algs).
- J Perm: https://jperm.net/algs/2look/pll
- Speedsolving wiki: https://www.speedsolving.com/wiki/index.php?title=2-Look_PLL

1. Corners:
   - Headlights on one side: T-perm with the headlights on the left.
   - No headlights: Y-perm (diagonal swap).
   - The wiki notes any adjacent-swap PLL (A, F, G, J, T) or diagonal-swap PLL (Y, V, E, N) can do this step.
2. Edges: Ua, Ub, H, Z.

`two_look: true` in `pll.json` marks T, Y, H, Z, Ua and Ub.

**Learning order inside 2-look** (J Perm, https://jperm.net/3x3/cfop/ll): 2-look OLL and 2-look PLL are "Recommended: Any level". A sensible order for the app:
1. EO line and L (dot is just both).
2. Sune and Anti-Sune.
3. The rest of OCLL.
4. The PLL edge algs, which J Perm says "can be memorized visually".
5. T-perm and Y-perm.

## 4. Full OLL / PLL learning order

**J Perm** (https://jperm.net/3x3/cfop/ll)
- Full PLL is "Recommended for: Sub-45". He suggests learning slowly, "at most 2 per day, and not every day". You already know 6 PLLs, and "Jb and F are just modified versions of T".
- Full OLL is "Recommended for: Sub-25". You already know 10 OLLs, and "a large chunk of the remaining cases can just be mirrored". Learn "one shape at a time … so you can easily recognize what you've learned", and use triggers to chunk the algs.
- Last Layer Optimization is for sub-15: AUF recognition, fewer regrips, turning faster, swapping algs.

**Order:** full PLL before full OLL. The community advice is the same: start with 2-look OLL and PLL, then move to full PLL, then full OLL (r/cubers "when should I learn" wiki, as summarised in search results).

**Feliks Zemdegs / CubeSkills.** Both PDFs say: "It is recommended to learn the algorithms in the order presented." The order is:
- **PLL:**
  1. Edges only: Ub, Ua, Z, H
  2. Corners only: Aa, Ab, E
  3. G perms: Ga, Gb, Gc, Gd
  4. Adjacent swap: Ra, Rb, Ja, Jb, T, F
  5. Diagonal swap: V, Y, Na, Nb
- **OLL:**
  1. OCLL: 26, 27, 21, 22, 24, 25, 23
  2. T: 33, 45
  3. Squares: 5, 6
  4. C: 34, 46
  5. W: 36, 38
  6. Corners correct, edges flipped: 28, 57
  7. P: 31, 32, 43, 44
  8. I: 51, 56, 52, 55
  9. Fish: 9, 10, 35, 37
  10. Knight: 13, 14, 16, 15
  11. Awkward: 29, 30, 41, 42
  12. L: 48, 47, 49, 50, 53, 54
  13. Lightning bolts: 7, 8, 11, 12, 39, 40
  14. Dots: 1, 2, 3, 4, 18, 19, 17, 20

**Suggested app default** (a synthesis of the above): ship the Feliks order with grouped "packs". After a case is learned, unlock its mirror next; the pairs are in section 7. Dots go last, since the [Learning from the Pros recon study](https://basilio.dev/cubing/ReconStats-v0.pdf) puts their median execution about 0.16 s slower than other OLLs.

## 5. Finger-trick notes for the most common algs

Two general rules from J Perm (https://jperm.net/3x3/fingertricks):
- For OLL, "it's best to start and end with both thumbs on the front", which makes it easier to go from F2L into OLL and from OLL into PLL.
- For PLL, "make sure you can AUF quickly after the algorithm is finished".

The notes below are standard community execution, not a single authoritative source. Treat them as defaults the user can override.

- **Sune `R U R' U R U2 R'` / Anti-Sune `R U2 R' U' R U' R'`.** Right-hand only, with no regrip. Push every `U` with the right index finger. Do `U2` as a double flick (index then middle finger), and `U'` with the left index finger. They are the base trigger for OCLL and appear as chunks in many OLLs (e.g. wide-Sune OLL 7 `r U R' U R U2 r'`).
- **T-perm `R U R' U' R' F R2 U' R' U' R U R' F'`.**
  - The first 4 moves are the "sexy move".
  - Do `R' F` as `R'` followed by an `F` pushed with the right index finger, the hand already in a home grip.
  - After `R2`, the `U' R' U'` are left-index flicks.
  - The last `F'` is a right-thumb or index pull.
  - Jb (`R U R' F' R U R' U' R' F R2 U' R'`) and F-perm reuse the T-perm body, which is why J Perm says they are easy once T is learned.
- **Ua/Ub `M2 U M U2 M' U M2` (and `U'` versions).**
  - Hold the cube with the left hand. Do the `M2` with the left ring and middle fingers as a double flick.
  - `U` is the right index finger.
  - `M` and `M'` are left ring or middle finger pushes and pulls on the back of the M slice.
  - `U2` is a right-hand double flick.
  - Source: [Speedsolving fingertrick discussion](https://www.speedsolving.com/goto/post?id=511147) and the related threads in the same search.
  - The 2-gen `R U' R U R U R U' R' U' R2` (Ua) and `R2 U R U R' U' R' U' R' U R'` (Ub) are the usual alternatives for people with weak M-slice fingertricks.
- **H / Z.** Pure `M2`/`U` sequences. Alternate the ring-finger `M2` flick with right-index `U` flicks. The wiki also lists `M2 U2 M2 U M2 U2 M2`-style H algs and says they "should only be used as Post-AUF tricks".
- **Aa/Ab `x R' U R' D2 R U' R' D2 R2 x'`.** Do `D2` as a left-ring double flick, and `U` with the right index finger. The `x` is a regrip-free wrist rotation.
- **G perms with D moves (`R2 U R' U R' U' R U' R2 D U' R' U R D'`).** Execute `D U'` / `U D'` simultaneously as a pinch: left ring on D, right index on U. The SpeedCubeDB data in this file keeps both the `D U'` and `U' D` orderings, since the two orders are equivalent.
- **Y-perm `F R U' R' U' R U R' F' R U R' U' R' F R F'`.** This is OLL 37 plus OLL 33 (`F R U' R' U' R U R' F'` then `R U R' U' R' F R F'`). That chunking makes it easy to learn.

## 6. AUF prediction

AUF means "Adjust U Face": a `U`, `U2` or `U'` before or after an alg (https://www.speedsolving.com/wiki/index.php?title=AUF).

- **Pre-AUF** puts the case into the orientation your alg expects. The JSON `pattern` / `recognition` fields describe that orientation for `algs[0]`. Many cases can instead be solved from a different angle with a different alg (a `y`/`y'`/`y2` version). SpeedCubeDB lists these as "orientations" and J Perm lists them as alternate algs, which avoids the pre-AUF.
- **Post-AUF prediction** (PLL). While recognising the PLL, also work out where the solved bar or block will end up after the alg. That way the final `U`/`U'`/`U2` is done without a pause. J Perm lists "Recognizing AUF" as a core sub-15 last-layer skill (https://jperm.net/3x3/cfop/ll).
  - In practice, predict from pieces the alg doesn't move, e.g. the solved bar in U perms or the 1x2x3 block in J perms. Their colours against the F2L centres tell you the final offset.
  - The app can compute the needed post-AUF exactly. Run `algs[i]` from the displayed state and compare the LL to the centres.
- **AUF-saving variants.** Some EPLL algs build the AUF in, e.g. the `M2 U2 M2 U M2 U2 M2`-style H algs that the wiki calls "Post-AUF tricks". The CubeSkills PDF marks a needed post-AUF in square brackets, e.g. `[U2]`. The app could show both.

## 7. Mirrors and inverses

All of these were computed by simulation and are stored per case.

**OLL left-right mirrors** (mirror `algs[0]` R↔L and it solves the paired case):

```
3-4, 5-6, 7-8, 9-10, 11-12, 13-14, 15-16, 26-27, 29-30,
31-32, 36-38, 39-40, 41-42, 43-44, 47-48, 49-50, 53-54
```

These are self-mirror (their mirrored alg solves the same case from another angle):

```
1, 2, 17-25, 28, 33, 34, 35, 37, 45, 46, 51, 52, 55, 56, 57
```

**OLL inverses depend on the alg.** For example, Sune ↔ Anti-Sune, and 28 ↔ 57 for the algs in the file. The `inverse_of` field gives the case for `algs[0]` specifically.

**PLL mirrors:** Aa↔Ab, Ga↔Gc, Gb↔Gd, Ja↔Jb, Na↔Nb, Ra↔Rb, Ua↔Ub. E, F, H, T, V, Y and Z are self-mirror.

**PLL inverses:** Aa↔Ab, Ga↔Gb, Gc↔Gd, Ua↔Ub. Everything else is self-inverse: E, F, H, Ja, Jb, Na, Nb, Ra, Rb, T, V, Y, Z.

**Ideas for the app:**
- **Teach a case through its mirror or inverse.** Once Ga is known, Gb is "Ga backwards" and Gc is "Ga mirrored".
- **Spaced repetition per pair:** schedule a case's pair soon after it is learned.

## 8. How fast top solvers execute OLL / PLL

**Learning from the Pros** (Basilio Noris, Stuart Clark and Gil Zussman; March 2021; 4,000+ reconstructed world-class solves, mostly from SpeedCubeDB). Index: https://basilio.dev/cubing/recons; PDF: https://basilio.dev/cubing/ReconStats-v0.pdf. The values below were read from the PDF's chart labels, so they are approximate.

| Step | TPS | Execution time |
|---|---|---|
| Cross | about 6.7 | about 1.07 s |
| F2L | about 10.1 | (whole step) |
| OLL | about 9.4 | about 1.03 s |
| PLL | about 10.0 | about 1.40 s |

Other figures from the same document:
- Dot OLLs have a median execution about 0.16 s slower than other OLLs.
- Its nine world-record-level solves (3.47 s or faster) averaged 9.7 TPS overall and about 32 moves.
- At faster solve times the last layer takes a smaller share of the total, thanks to skips.

**Individual reconstructions** on Speedsolving:
- One sub-14 average shows PLL at about 0.92 s and 13.8 TPS.
- A 13.90 average shows PLL at 1.71 s and 7.6 TPS.
- Source: https://www.speedsolving.com/goto/post?id=1289732, plus the cubesolv.es-linked threads in the same search.

**Journal of Emerging Investigators (2022)**, "Rubik's cube: What separates the fastest solvers from the rest?" (https://emerginginvestigators.org/articles/21-189). The video analysis covered 16 solvers and 69 solves.
- TPS against solve time: r = −0.85.
- The share of time spent pausing was 33% for a 10 s solver and 46% for a 20 s solver.
- For sub-15 solvers, improving OLL and PLL *recognition* time (the last-layer pauses) is called out as important.
- In the Reddit survey (n = 1,385), nearly all sub-10 solvers know at least 100 algorithms.

**Move counts.** The speedsolving wiki gives speed-optimised OLL at about 9.7 HTM and PLL at about 13 STM. The primary algs in these files average 9.8 STM (OLL) and 13.2 STM (PLL).

**Practical targets for the app** (my synthesis, not a published standard):
- Recognition plus execution for a single PLL: about 1.0–1.5 s for an advanced solver, about 2 s for intermediate.
- Execution-only TPS of 10–14 on finger-trick-friendly PLLs is world-class.

There is no authoritative "PLL time attack" record list. Forum anecdotes put sub-15 solvers at about 35–45 s for all 21 PLLs.

## 9. Drills worth building into the trainer

- **Recognition-only flash drill.** Show the `pattern` (top-down, or 2-sided for PLL) and time how long it takes to name the case. Report recognition and execution separately, as in the [Speedsolving PLL drill idea](https://www.speedsolving.com/threads/pll-practice-drill-idea.85973/).
- **Random-case trainer** in the style of J Perm's OLL/PLL trainers (linked from https://jperm.net/3x3/cfop/ll).
  - Generate the case with a random pre-AUF and a random y-angle.
  - Let the user pick a subset: a group, 2-look only, or learned only.
  - Weight towards slow or mistaken cases.
  - The SpeedCubeDB setup strings, or the inverse of `algs[0]` plus a random AUF, give scrambles.
- **2-sided PLL quiz.** Show only the front and right faces (6 stickers), and require AUF prediction as well (see section 6).
- **PLL time attack.** Run all 21 PLLs back-to-back on one cube: each alg leaves a state the next one fixes, or the app gives setups. It is a classic execution drill; the forum notes it doesn't map directly onto solve time.
- **TPS / fluency reps.** Run the same alg 5–10× in a row with a metronome, then remove the metronome. The aim is no pauses and no regrips.
- **AUF drill.** After a PLL, the user must predict the post-AUF (`U`, `U'`, `U2` or none) before executing.
- **Learning cadence.** For PLL, at most 2 new algs a day and not every day (J Perm). For OLL, learn by shape group and unlock mirror pairs together.
- **Trigger chunking.** Display algs split into triggers, e.g. `(R U R' U')` or `(R' F R F')`, as both the CubeSkills PDFs (which use round brackets for this) and J Perm's "Show Triggers" option do.

## 10. Notes and caveats

- Speedsolving wiki content came from Wayback snapshots dated 2025-12 to 2026-02. The live site returned a Cloudflare challenge.
- algdb.net and ruwix were not needed. The J Perm, SpeedCubeDB and CubeSkills data already agree on every case, and all algs were machine-verified.
- SpeedCubeDB votes are a snapshot from 2026-10-28.
- Cases where the "most popular" alg was a judgement call:
  - **OLL 2, 3, 4.** These dot cases have several near-equal popular algs, some using `D` moves after a `y'`. OLL 4's primary keeps its `y'` because no rotation-free alg had at least 60% of its votes.
  - **Ja.** The most-voted alg is `y2 x R2 F R F' R U2 r' U r U2 x'`. The common rotation-free alternatives are second and third.
  - **E.** The most-voted alg is `y x' R U' R' D ... x`. The rotation-free alternative is `R2 U F' R' U R U' R' U R U' R' U R U' F U' R2`.
  - **Gb.** The most-voted alg on SpeedCubeDB starts with `D` (`D R' U' R U D' R2 ...`, 144 votes). The classic `R' U' R U D' R2 U R' U R U' R U' R2 D` (112 votes) is second.
  - **T.** The third T alg (`R2 u R2 u' R2 F2 u' F2 u F2`, 19 votes) is unusual but valid. Drop it if you want only mainstream algs.
