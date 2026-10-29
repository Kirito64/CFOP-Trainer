# F2L: advanced knowledge and drills

Research notes for the CFOP trainer: what to teach, what to drill, and what the
app could build. The algorithm data is in `f2l.json` in this folder, which has all 41
cases for the FR slot, rotationless, each one simulator-checked.

Conventions follow `f2l.json`. Cross on D (white bottom), WCA/SiGN notation, and
"front-colour"/"right-colour" mean the colours of the F and R centres.

---

## 0. Sources used (primary)

| Source | What it gave |
|---|---|
| SpeedCubeDB F2L set: https://www.speedcubedb.com/a/3x3/F2L (per case `https://www.speedcubedb.com/a/3x3/F2L/F2L_<n>`) | Canonical case numbering 1–41, case setups, community-voted algs for all 4 slots |
| Speedsolving wiki, First Two Layers: https://www.speedsolving.com/wiki/index.php/First_Two_Layers (read via Wayback Machine because Cloudflare blocks direct fetches) | Case groups, many alternative algs, avg 6.7 HTM/slot figure |
| CubeSkills (Feliks Zemdegs & Andy Klise) F2L PDF: https://www.cubeskills.com/uploads/pdf/tutorials/f2l.pdf | Suggested algs and the "set up, then basic insert" presentation |
| CubeSkills F2L for all four slot angles: https://www.cubeskills.com/uploads/pdf/tutorials/f2l-algorithms-different-slot-positions.pdf | Back-slot (BR/BL) and FL versions of the cases |
| CubeSkills "Some useful cases": https://www.cubeskills.com/uploads/pdf/tutorials/useful-f2l-algorithms.pdf | Edge-in-wrong-slot, two-slot and odd short algs |
| CubeSkills Lookahead Progression Framework: https://www.cubeskills.com/blog/lookahead-progression-framework | Lookahead stages and drills (tracking, metronome, visualisation, blind pairs) |
| CubeSkills 5.97 reconstructions: https://cubeskills.com/blog/597-reconstructions-commentary | Per-pair move counts and TPS at world-class level |
| J Perm CFOP F2L page: https://jperm.net/3x3/cfop/f2l | Learning order and the level at which to start each topic |
| J Perm "Best F2L Algorithms" doc: https://bit.ly/bestf2l (Google Drive PDF https://drive.google.com/file/d/1nzAXYUWZJ6H2wIOXaHdWXep3W57tArbR/view) | 41 basic + 36 "advanced" (piece in wrong slot) cases, all four slots |
| J Perm Advanced F2L playlist: https://www.youtube.com/watch?v=3B_oB2YrLvk&list=PLI24ciRbl8BUTnnzmJIIn3Ts_6-mKMBP7 | Look-ahead, multiple options per case, practice techniques |
| Speedsolving wiki pages: Advanced F2L, Keyhole F2L, Multislotting, XCross, Look ahead, CFOP, ZBLS, VHLS, Winter Variation (all under https://www.speedsolving.com/wiki/index.php/…) | Definitions, history, alg counts |
| csTimer scramble list: https://github.com/cs0x7f/cstimer/blob/master/src/lang/en-us.js | F2L-only scramble types for practice |
| Ruwix F2L: https://ruwix.com/the-rubiks-cube/advanced-cfop-fridrich/first-two-layers-f2l/ | Intuitive principles, "never affect solved blocks" |

Sources I tried that did not work:
- `jperm.net/algs/f2l` returns 404. J Perm's F2L algs live in the Google Drive PDF above.
- bestsiteever.net (Roman Strakhov) has OLL, PLL, PLL-recognition, ZBLL and inverse-scramble
  trainers but no F2L trainer as of this research. Its timer-like "select cases → drill → review
  weak cases" UX is still a good model.
- algdb.net now redirects to SpeedCubeDB in practice. The jsr package `@moishy/algsets`
  (https://jsr.io/@moishy/algsets/doc/f2l/) is a copy of the same 41 cases × 4 slots
  (622 algs), so it is not an independent source.

---

## 1. Intuitive F2L principles

F2L solves the four corner+edge pairs ("slots") that sit between the cross and the
last layer. Each corner is paired with its edge in the U layer, and the pair is
inserted as a block. The idea goes back to Conway/Benson/Seal (1979). The Speedsolving
wiki says F2L "should be done intuitively, even though there are algorithms for each
case; algorithms should only be used for slower cases."
(https://www.speedsolving.com/wiki/index.php/First_Two_Layers)

### 1.1 The three basic inserts

Every F2L solution ends with one of these patterns, or a mirror of one. CubeSkills
prints each alg as black setup moves followed by a blue basic insert
(https://www.cubeskills.com/uploads/pdf/tutorials/f2l.pdf).

| Insert | FR-slot form | When |
|---|---|---|
| **3-move insert** | `R U R'` / `F' U' F` | Corner above the slot with white facing sideways and the edge already "across" (F2L 3, 4). Lift the slot to meet the piece, turn U, put the slot back. |
| **4-move insert (pair already made)** | `U R U' R'` / `U' F' U F` | Corner and edge already connected in the U layer (F2L 1, 2) |
| **Pair from white-up corner** | e.g. `R U2 R' U' R U R'`, `U R U2 R' U R U' R'` | Corner white-up: first turn it into one of the cases above (F2L 17–24) |

Plus the "sledgehammer" family, `R' F R F'` and `F R' F' R`. These insert or
extract a pair without an AUF and appear all over the slot cases (25–41).

### 1.2 Core mental moves

- **Pair, then insert.** Get the corner and edge into the U layer, join them into a
  correctly connected pair (colours matching on both shared faces), then insert.
- **Separate, then pair.** If the pieces touch but are wrongly connected (F2L 11–16,
  23, 24), break them apart first. The usual pattern is `R U' R'` or `R U2 R'`, which
  hides the corner in the slot area while the edge moves.
- **Hide the corner / use the slot as a parking space.** Moves like `R U R'` lift the
  slot, carry a piece over, and put the slot back. This is how most non-trivial cases
  work. Read the `notes` field of each case in `f2l.json`: it records, from simulation,
  the exact point in the primary alg where the pair forms.
- **Pieces stuck in a slot.** Pull them out with a 3- or 4-move trigger (`R U R'`,
  `R U' R'`, sledgehammer) so they become a U-layer case. Ideally the extraction
  also pairs them.
- **Never break solved work.** Ruwix: "We can never affect the solved blocks!"
  CubeSkills (Feliks, in comments) adds that you should never bring solved F2L slots
  back into the U layer during the solve, because it breaks lookahead
  (https://www.cubeskills.com/blog/lookahead-progression-framework).
- **2-gen thinking.** The wiki notes that in 30 of 41 cases the edge is in the U
  layer showing either the R or the F colour on the side. If it shows R colour, the
  pair can be solved with R/U only. If it shows F colour, use `y'` and solve into the
  back slot with R/U, or (rotationless) use F/U moves directly. Only the 6 cases with
  the edge *unoriented in the slot* need both R and F
  (https://www.speedsolving.com/wiki/index.php/First_Two_Layers).

### 1.3 Case structure (41 cases)

Standard grouping (Speedsolving wiki, used as `group` in `f2l.json`). SpeedCubeDB's
grouping is kept in `speedcubedb_group`.

| Cases | Wiki group | SpeedCubeDB group |
|---|---|---|
| 1–4 | Basic inserts | Free Pairs |
| 5–8 | Reposition edge | Disconnected Pairs |
| 9–14 | Reposition edge and flip corner | Disconnected / Connected Pairs |
| 15–18 | Split pair by going over | Connected Pairs |
| 19–24 | Pair made on side (corner white-up) | Disconnected / Connected Pairs |
| 25–30 | Corner in slot, edge in U | Corner In Slot |
| 31–36 | Edge in slot, corner in U | Edge In Slot |
| 37–41 | Both pieces in slot | Pieces In Slot |

Numbering gotcha: the wiki lists "F2L 37 = Solved", so wiki F2L 38–42 are
SpeedCubeDB/`f2l.json` F2L 37–41. Cases 1–36 match exactly.

---

## 2. Other slots (FL, BL, BR) and how they differ

Real solves need all four slots. CubeSkills publishes every case for all four slot
angles (https://www.cubeskills.com/uploads/pdf/tutorials/f2l-algorithms-different-slot-positions.pdf),
and SpeedCubeDB has a tab for each slot. Ways to handle a non-FR slot:

1. **Rotate** (`y`, `y'`, `y2`) so that the slot becomes FR. This is simple but costs a
   rotation and resets your lookahead view. Forum advice is to rotate at most once
   (90°) per pair, and a `y2` usually means a back-slot insert was available.
2. **Use the mirrored / back-slot form without rotating:**
   - **BR (back-right):** R-hand algs with `R'`/`R` swapped in role. Basic inserts are
     `R' U' R` and `R' U R`. More examples, taken from the CubeSkills BR page and the
     BR versions of popular `y'` algs, and verified with the sticker simulator to solve
     into BR and keep everything else: `U2 R' U' R U' R' U R`, `R U2 R2 U' R2 U' R'`,
     `R' F' U2 F R`, `R' U2 R U R' U' R`, `U R' U R U' R' U' R`.
     These are all 2-gen or near-2-gen and use the same right-hand fingertricks
     (CubeSkills BR page).
   - **FL (front-left):** use `L' U' L`, `F U F'`, `L' U L`, or do a `y'` and solve
     as BR. Many solvers do FL with left-hand `L'` moves. Others prefer `F`
     moves or a `y'`/`d` adjustment.
   - **BL (back-left):** `L U L'`, `L U' L'`, `L U2 L' U' L U L'`. This is the
     hardest slot to see, so it is usually rotated to the front (`y2`, or `y` then
     solve as BR). It is also a common choice to fill early, while it is still easy
     to track.
3. **`d` / `D` adjustments.** `d R' U R` style algs are rotations in disguise: the
   cross ends up offset until the `d'`. That is why they are excluded from
   `f2l.json`. `D R' U R D'` is a keyhole-style D trick. It is an FR/BR two-slot
   move, so use it only when that makes sense.

The case logic is the same in every slot. What differs per slot is **recognition from
the angle you are holding the cube at** and **ergonomics**. Front slots are visible
and easy to insert into with R/U or F/U. Back slots are hidden but can be inserted
2-gen (`R'…R` for BR), and they suit lookahead because the front slots stay open
and visible. Common advice is to fill back slots while they are still easy to track.
A drill for the app: show the same case in all four slots at random and require
rotationless recognition.

---

## 3. Empty slots, keyhole and multislotting

### 3.1 Using empty slots

With unsolved slots around, there are more and shorter solutions, because standard
algs are designed to keep every other slot intact, which makes them suboptimal when
neighbours are empty. Examples from the CubeSkills "useful cases" sheet
(https://www.cubeskills.com/uploads/pdf/tutorials/useful-f2l-algorithms.pdf), checked
with the simulator:

- Edge in the FL slot, corner oriented: `R' F R2 U' R' U2 F'`. It affects both the FR and FL slots.
- Edge in the BR slot, corner oriented: `R' F R F' R' U' R`. It affects FR and BR.
- Edge in a different slot, corner not oriented: `R' F U F' R`, `F R' U' R F'` (FL/BR on the sheet).
- Corner solved, edge in the other right-hand slot: `R2 U' R2 U R2` and
  `R2 U R2 U' R2`, labelled FR and BR on the sheet. Both affect FR and BR.
- Miscellaneous: `F R U' R' U' F'` (FL), `r U' R' U R U r'` (FR; this is F2L 6 without the U').

Several of the wiki's alternatives are marked "if the front-left slot is open" or "if
the back-right slot is open". Examples are F2L 5: `U F' R' F' R F` (needs FL open) and
F2L 6: `U' R F R F' R'` (needs BR open). They are shorter but disturb the neighbour
slot. That is fine when it is empty.

Rule of thumb from forum coaching: move the empty slot over, put a piece in it, then
re-align. This usually costs ≤ 6 moves.

### 3.2 Keyhole

From the wiki (https://www.speedsolving.com/wiki/index.php/Keyhole_F2L): solve one piece
of a slot (often the corner) first. Then use the *empty* neighbouring slot as a
"keyhole": turn D so that the unsolved position is under where the piece is, insert
with a 3-move trigger (`R U' R'` or `F U F'`), and turn D back. In CFOP it shows
up mostly as **edge-in-slot / corner-in-slot tricks with D or d moves**. Examples are
the wiki's F2L 32 alternatives `U2 R d' R U R' d R'` and `U R d' R U2 R' d R'`, and
SpeedCubeDB's F2L 34 alternative `U R' D' R U' R' D R`. It is useful when a pair is hard
to make but one piece can drop straight in.

### 3.3 Multislotting

Proposed by Sébastien Felix (2007): "an extension to F2L that solves two corner-edge
pairs at once, or more accurately, modifies the insertion for the first pair to set
up the second." (https://www.speedsolving.com/wiki/index.php/Multislotting)

In practice:
- **Insert one pair while setting up the next.** Pick the U/U'/U2 direction or the
  insertion variant (`R U R'` vs `F' U' F`, sledgehammer vs 3-mover) that leaves the
  next pair's pieces connected or in an easy position.
- **Cancel moves between pairs.** For example, a pair ending in `R'` followed by a
  pair starting with `R` merges. CubeSkills commentary on a 5.97 average shows pairs 2
  and 3 being solved together through lookahead.
- **Pseudo-multislotting** when pieces of two slots are mixed (one solved piece, one
  wrong slot): J Perm's "advanced" section 2 (36 cases: one piece in the wrong slot)
  covers this.

---

## 4. Edge control / partial edge control / last slot variants

The last pair (LS) is where advanced solvers start influencing the last layer.

- **Partial edge control.** Choose how to insert the last pair (and sometimes the
  third) so that more LL edges end up oriented, avoiding the dot OLL cases. The usual
  levers are inserting with `R U R'` vs `F' U' F`-type triggers, or a sledgehammer
  vs a 3-mover. These change edge orientation differently. Forum users describe it
  as "largely intuitive, it's just a matter of inserting the pairs the right way"
  and say recognition must be "lightning fast". Chris Hardwick's ZBF2L page points
  at its cases 1 and 13 for partial edge control
  (https://speedcubing.com/chris/zbf2l.html).
- **VHLS (formerly VHF2L).** Insert a connected last pair while orienting all LL edges,
  32 algs, ~6.6 moves (https://www.speedsolving.com/wiki/index.php/VHLS).
- **ZBLS / EOLS (formerly ZBF2L).** Any last-slot case plus EO, 302 cases / 125 algs.
  "Only a handful of cubers have learned ZBLS in its entirety"
  (https://www.speedsolving.com/wiki/index.php/ZBLS).
- **Winter Variation (WVLS).** With LL edges already oriented and the pair connected,
  insert while orienting the corners. 27 algs, avg 8.07 moves, forces a PLL
  (https://www.speedsolving.com/wiki/index.php/Winter_Variation). See `wv.json`.
- **OLL prediction while solving the last pair.** CubeSkills "easy mode": predict EO
  during the last pair. "Hard mode": predict the whole OLL.

The full list of advanced-F2L extensions (Only-F2L, EO control, CO control,
permutation control, multislotting) is on
https://www.speedsolving.com/wiki/index.php/Advanced_F2L.

---

## 5. Cross+1, XCross, pseudo-slotting

- **XCross / Cross+1.** Solve the cross and the first pair in one planned step
  (Chris Hardwick, 2003). The wiki separates them. An *XCross* is reached by
  blockbuilding (for example a 2x2x2 block plus cross edges). *Cross+1* means
  solving the cross and then a pair that was planned in inspection. Cross+1 usually
  takes more moves but is more ergonomic. XXCross is rare, and XXXCross is even rarer
  (https://www.speedsolving.com/wiki/index.php/XCross).
- **Predicting the first pair** (J Perm, recommended from sub-15): plan the cross and
  find (or track) the first pair during the 15 s inspection, which removes the pause
  after the cross. He calls it "one of the most overlooked fundamentals" and "the most
  rewarding skill for reducing times at a high level" (https://jperm.net/3x3/cfop/f2l).
  CubeSkills reconstructions often show "two pairs planned during inspection" at
  world-class level.
- **Pseudo-slotting.** Insert pairs while the D layer (cross) is offset by a quarter or
  half turn. Pairs go into the "wrong" slot relative to the centres but the right one
  relative to each other, and one D/D'/D2 at the end fixes everything. This lets you
  use whatever pair/slot combination is cheapest, and it is common in XCross planning
  (a "pseudo XCross"). The jsr `@moishy/steps` docs define it as "progress measured up
  to a shared D-layer offset" with "one D turn, or none" at the end
  (https://jsr.io/@moishy/steps/doc). It is associated with top solvers such as Tymon
  Kolasiński. Source coverage here is thin (no wiki page exists), so treat it as an
  advanced/optional topic.

---

## 6. Rotationless F2L

- Rotations cost time, cause regrips, and hide pieces mid-turn. The trend among top
  solvers is "smooth, rotationless F2L" (CubeSkills lookahead article). One
  CubeSkills reconstruction notes a solve that "was rotationless because one F2L edge
  was already oriented".
- Rotationless does not mean never rotating. The wiki's 2-gen note above shows that
  F-colour-facing edges either need F moves or a `y'`. Many top solvers still rotate
  when the rotationless alternative is long or awkward. Forum advice: at most one
  90° rotation per pair, no `y2`.
- Tools for going rotationless:
  1. F-face versions of R-face algs (`F' U' F`, `U' F' U F`, `F' U2 F U F' U' F` …). The
     F2L 13, 18 and 20 entries in `f2l.json` use these instead of the popular
     `y' …` algs.
  2. Back-slot 2-gen inserts (`R' U R`, `R' U' R`, BR versions above).
  3. Wide moves and slices (`r U' r' U2 r U r'`, `M U r U' r' U' M'`, `r' U2 R2 U R2 U r`).
  4. Sledgehammers, which avoid both AUF and rotation for slot cases.
- J Perm's "F2L optimization" (sub-15): "As much as possible, cube rotations and extra
  moves should be avoided… With this video and the F2L algorithm document, you can check
  all of your solutions against the best ones."

---

## 7. Efficiency / move-count targets

| Figure | Value | Source |
|---|---|---|
| Wiki F2L average | ~6.7 HTM per slot, ~26.8 HTM for 4 slots | https://www.speedsolving.com/wiki/index.php/First_Two_Layers (infobox) |
| Whole CFOP solve | ~55 moves | https://www.speedsolving.com/wiki/index.php/CFOP_method (infobox) |
| Forum "efficient CFOP" breakdown (STM incl. AUFs) | cross 6, pairs ~29, OLL 10, PLL 15 | Speedsolving thread "Average moves per solve" https://www.speedsolving.com/threads/average-moves-per-solve.74166/ (seen via search snippet; the forum blocks direct fetch) |
| World-class reconstruction (CubeSkills 5.97 average) | individual pairs 4–12 STM, mostly 6–8; totals 51–61 STM; TPS 8.25–9.57 | https://cubeskills.com/blog/597-reconstructions-commentary |
| Last-slot sets | VHLS ~6.6 moves; WV avg 8.07 | VHLS / Winter Variation wiki pages |

Practical targets for the trainer: below ~8 STM per pair on average (≈ 30–32 for
F2L including AUFs) is solid. ~6.5–7.5 per pair (≈ 26–30 including an XCross or a
planned first pair) is what top reconstructions show. Per case, the shortest
2-gen/rotationless algs in `f2l.json` are 3–11 moves. Compare the user's pair
lengths with the case's primary alg length.

---

## 8. Fingertricks for F2L

General principles (J Perm, https://jperm.net/3x3/fingertricks): "For algorithms to be
as fast as possible, you need to do turns quickly, and don't waste time changing your
grip". Start and end in home grip so that F2L flows into OLL. The common F2L
fingertricks below are standard community practice. Exact technique varies by solver.

- **Home grip:** thumbs on F, fingers on B. `R`/`R'` are right-wrist turns, and `L`/`L'`
  are left-wrist turns.
- **U with right index, U' with left index.** So `R U R'` uses a right-index U flick,
  and `R U' R'` uses a left-index U'. Choosing the hand for each U is what removes
  regrips between triggers.
- **U2:** a double flick (index + middle) of either hand. Pick the hand that leaves
  the grip ready for the next trigger.
- **F / F':** done with the index finger or thumb, depending on grip. Sledgehammer
  `R' F R F'` and its reverse are designed to need no regrip. Prefer F-algs whose F
  turns fall naturally after an R move.
- **D / D':** ring finger (left ring for D, right ring for D'). These are useful in
  keyhole-style and `R' D' R U' R' D R`-type algs (F2L 15 alt, F2L 34 alt).
- **Wide r and M:** `r` is a wrist turn like R. `M`/`M'` slices are usually done with a
  ring finger. They are used in `M U r U' r' U' M'` (F2L 15) and
  `r' U2 R2 U R2 U r` (F2L 8).
- **Regrips:** every regrip costs time and blocks your view of the cube. Coaching
  threads list "minimizing regrips in F2L" next to lookahead and first-pair planning
  as what separates faster solvers.
- **Smoothness over speed:** "keep turning calm and hands quiet… keep the cube steady
  in the air" so that eyes and brain have less to process (CubeSkills).

---

## 9. Lookahead techniques

Lookahead "will rapidly become the most important concept in all of speedsolving…
pros never seem to pause" (J Perm). The wiki definition: look for the pieces needed for
the next step while turning, so that solves are close to pauseless
(https://www.speedsolving.com/wiki/index.php/Look_ahead).

CubeSkills **Lookahead Progression Framework**
(https://www.cubeskills.com/blog/lookahead-progression-framework):

1. **Spotting** (beginner): watch the current pair, then search for the next one.
2. **Tracking** (intermediate): while solving pair N, follow pair N+1's pieces with
   your eyes. Even tracking *one piece* of the next pair is a good start.
3. **Knowing** (advanced): predict where future pieces will end up before you
   execute the current moves.

Techniques:
- **Know your F2L well enough to solve a pair without looking.** If execution needs
  your eyes, your eyes cannot look ahead.
- **Braking point** (credited to RiDo): slow down on the last ~3 moves of each pair,
  which is when to look for the next pair.
- **Don't look at the pieces you are currently solving.** This also applies to the
  cross: the hardest transitions are cross → first pair and pair → pair.
- **Avoid choppy F2L**, the pattern of a fast burst, a pause, and another fast burst.
  The guiding idea is "go slow and look ahead".
- **Don't pull solved slots into U** (Feliks).
- **Reduce rotations.** A rotation re-shuffles everything you were tracking.
- **Fill hidden slots (back) early** while you can still see their pieces, and keep
  front slots open for easy viewing and inserting. This is common forum advice.

---

## 10. Common F2L mistakes

1. **Learning algorithms before intuition.** CubeSkills: "It is not recommended to learn
   any of these algorithms before learning intuitive F2L." J Perm says the same.
2. **Turning too fast to look ahead**, which produces choppy solves with pauses after
   every pair.
3. **Rotating for every pair**, including `y2`. Use back-slot inserts and F-face algs
   instead.
4. **Regrips mid-pair**, from choosing an alg or U-hand that breaks home grip.
5. **Breaking up already-connected pairs or solved slots.** A CubeSkills
   reconstruction comments "a connected pair was broken up in a hurry… no time to stop
   and think!" Feliks: never bring solved slots back into the U layer.
6. **Looking at the cross/pair being solved** instead of the next pieces.
7. **Always using the same slot (FR)**, which means never learning recognition from
   other angles.
8. **Not planning in inspection.** Planning only the cross leaves a pause before pair 1.
9. **Ignoring the efficiency of common cases.** Recheck your own solutions against
   the reference algs (J Perm doc, SpeedCubeDB) once sub-15.

---

## 11. Recommended learning order

From J Perm's CFOP F2L page (https://jperm.net/3x3/cfop/f2l), with his suggested level:

| Stage | Recommended for | What |
|---|---|---|
| Intuitive F2L | beginner | Understand pair → insert, and the 3 basic inserts. Practise "until it feels somewhat natural" |
| Advanced F2L | sub-30 | Combine steps (pair while moving to top), use empty slots, back slots, and choose better options |
| Look ahead | sub-20 | Track the next pair while solving the current one (it waits until F2L is near muscle memory because "the brain can't focus on multiple things very well when going fast") |
| F2L optimization | sub-15 | Remove rotations and extra moves. Check your solutions against the Best F2L doc |
| Predicting first pair | sub-15 | Plan cross + first pair (or track it) in inspection |
| Next steps | sub-12 | Advanced F2L playlist: where to look during bad cases, multiple options per case, practice techniques, faster recognition |

A suggested order within the 41 cases for the app's curriculum:
1. 1–4 (basic inserts) → 2. 5–10 and 19–22 (common U-layer setups) → 3. 11–18, 23–24
(wrongly connected / split) → 4. 25–36 (one piece in slot) → 5. 37–41 (both in slot,
rare) → 6. the same cases in BR/FL/BL → 7. empty-slot and wrong-slot cases (J Perm
section 2, CubeSkills "useful cases") → 8. last-slot extensions (partial EO, WV, VHLS).

---

## 12. Drills and practice routines

Recommended by experts and sources, plus how the app could implement each:

| Drill | Source | How to practise / app implementation |
|---|---|---|
| **Slow solves / "go slow and look ahead"** | CubeSkills; Speedsolving look-ahead threads; forum consensus | Solve at reduced TPS with no pauses. App: target-TPS mode that flags pauses (> X ms with no move from a smart cube, or self-reported) |
| **Metronome drill** | CubeSkills | One turn per beat during F2L. Choose a tempo that stretches lookahead without frequent mistakes (no BPM given). App: built-in metronome with adjustable BPM and a progression ladder |
| **Tracking drill** (6 steps) | CubeSkills | Cross → find pair 1 → plan it without memorising notation → before moving, find a different next pair → solve pair 1 while tracking pair 2 with your eyes → repeat. App: guided step-by-step prompts |
| **Blindfolded single pairs** | CubeSkills; forum (credited to Dylan Miller) | Look at the case, close your eyes, solve the pair. App: show the case, hide it on first move/keypress, then ask "did the pair solve?" |
| **Visualisation drill** | CubeSkills | Eyes closed: predict where the FR pair / a single piece goes during `R U R'`, then `R U' R' U R U' R'`. App: quiz showing a case + move sequence and asking where the piece ends up |
| **Two-look F2L drill** | CubeSkills | Plan and execute two pairs blindfolded, or memorise pair 1, glance at pair 2, close your eyes and solve both |
| **Braking point** | CubeSkills (RiDo) | Consciously slow the last 3 moves of each pair and move your eyes |
| **F2L-only scrambles** | csTimer "cross solved" (`f2l`), "easy xcross" (`easyxc`), "last slot + last layer" (`lsll2`) | Time only F2L. App: generate random-state "cross solved" scrambles (random F2L pieces, cross fixed) |
| **Case trainer (algorithmic)** | SpeedCubeDB / J Perm doc / this repo's `f2l.json` | Setup = inverse(alg) + random AUF + random LL. Drill weak cases by stats (like bestsiteever's OLL/PLL trainers) |
| **All-angle recognition** | Forum advice | Show each case in FR/FL/BR/BL and from different pre-AUFs. Require recognition without rotating |
| **Inspection / first-pair prediction** | J Perm; CubeSkills reconstructions | 15 s inspection: plan cross + first pair, execute blind or with one glance. App: inspection timer + "plan" mode |
| **Efficiency review** | J Perm F2L optimization | After a solve, compare each pair's move count to the reference alg for that case. App: smart-cube or manual move-count entry |
| **Reconstruction study / walkthroughs** | J Perm example solves playlist; CubeSkills reconstructions | Replay expert solves pair by pair. App: load a reconstruction and step through it with a 3D cube |
| **OLL/EO prediction on the last pair** | CubeSkills | While inserting pair 4, call the OLL (or just the EO) before it appears |

---

## 13. Notes for building the trainer (data model)

- `f2l.json` stores the **FR** slot only. To show a case in another slot, conjugate
  with a rotation. Checked with the sticker simulator: `y A y'` solves **BR**,
  `y' A y` solves **FL**, and `y2 A y2` solves **BL**, where A is any FR alg. So the
  BR setup is `y · inverse(A) · y'`. Show the user either "rotate, then A" or a
  dedicated rotationless alg for that slot. SpeedCubeDB lists per-slot algs under its
  Front Left / Back Left / Back Right tabs.
- Case identity: every alg in a case in `f2l.json` produces the **exact same** FR piece
  state, not just the same state up to AUF. Leading `U`/`U'`/`U2` in algs are part of
  the published solutions for SpeedCubeDB's canonical state (corner always at UFR or
  in the slot). For a trainer, add a random pre-AUF in front of the setup and tell the
  user "AUF + alg".
- The project verifier (`verify_algs.py`) compares F2L cases up to post-AUF. The data
  here also passes a stricter exact-state check.
