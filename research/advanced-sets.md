# Beyond full CFOP: advanced sets and techniques (3x3)

Research notes for the CFOP trainer app. Compiled 2026-10-28.

**Sourcing.** Facts come from primary community sources: the speedsolving.com wiki (read through Wayback Machine snapshots because the live wiki sits behind a Cloudflare challenge), SpeedCubeDB, jperm.net, cubeskills.com, csTimer source, and speedsolving.com forum threads. Where a recommendation is **my own synthesis** and not a sourced statement, it is marked *(synthesis)*.

**Companion files**

- `coll.json`: 42 COLL cases, 182 algs, all simulator-verified
- `wv.json`: 27 Winter Variation cases, 121 algs, all simulator-verified, no rotations

See [Data files](#data-files-colljson-wvjson) at the end for what was verified and the source errata found.

---

## 0. At-a-glance table

| Set / technique | Cases | Step | Prereqs | Who (rough) | App-friendly? |
|---|---|---|---|---|---|
| Cross planning / 8-move rule | intuitive | Inspection + cross | — | everyone | yes (drills) |
| Colour neutrality (dual / full) | — | Inspection | solid cross | early learners, sub-20 path | yes (drills) |
| XCross / Cross+1 / first-pair prediction | intuitive | Inspection | efficient cross | sub-20 (XC), sub-15 (pair prediction) per J Perm | yes (drills) |
| Keyhole | intuitive | F2L | — | beginners/intermediate, plus situational use | low |
| Winter Variation (WV) | 27 (54 with mirrors) | Last slot + OCLL | full OLL, pair on R U' R' with edges oriented | sub-15 *(synthesis)* | **yes, `wv.json`** |
| Summer Variation (SV) | 27 (54 with mirrors) | Last slot + OCLL (R U R' insert) | WV | sub-12 *(synthesis)* | yes (SpeedCubeDB has 27) |
| VLS | 432 (216 without mirrors) | Last slot + full OLL | WV | top-level / enthusiasts | partial (WV subset) |
| HLS | 432 incl. mirrors | Last slot + full OLL (R U R' insert) | SV | enthusiasts; algs mostly unpublished | no |
| OLS (all) | 17,712 | Last slot + OLL | — | nobody in full | no |
| MGLS = ELS + CLS | 21 + 104 | Last slot (two steps) | — | enthusiasts; CLS useful situationally | maybe (CLS) |
| ZBLS / EOLS (ex-ZBF2L) | 302 | Last slot + EO | — | ZB users | no |
| Partial edge control | intuitive | Last slot | — | sub-15 *(synthesis)* | concept page |
| OCLL / EPLL | 7 / 4 | 2-look sub-steps | — | beginners | (core app) |
| COLL | 42 (40 + 2 oriented swaps) | LL corners (edges oriented) | full OLL/PLL | sub-12 to sub-10, or ZBLL-bound *(synthesis + forum)* | **yes, `coll.json`** |
| OLLCP | 331 | OLL + corner permutation | full OLL, COLL | enthusiasts | no (doc only) |
| ZBLL | 472 (493 with 21 PLLs) | 1LLL when edges oriented | COLL, full PLL | sub-8 to sub-9 elites / enthusiasts | subsets later |
| ZZLL | 169 | ZBLL subset (two opposite edges solved) | COLL | ZZ-b users | no |
| 2GLL | 84 | ZBLL subset, ⟨R,U⟩ | COLL | ZZ / OH users | no |
| 1LLL | 3915 (cases mod AUF) | Entire LL | — | nobody in full | no |
| ELL | 29 | LL edges after CLL | CLL | non-CFOP (CLL/ELL, BLD) | no |
| CMLL | 42 | Roux step 3 (not CFOP) | — | Roux | no |
| AUF / PLL prediction, 2-sided recognition | — | LL recognition | full PLL | sub-15 | yes (recognition drills) |

Skip odds (CFOP, random LL): OLL skip 1/216, PLL skip 1/72, full LL skip 1/15552. After COLL, the EPLL skip chance is 1/12.

---

## 1. Cross

### 1.1 Cross planning in inspection, and the 8-move rule

- **What it is.** You plan the whole cross during the 15 s of WCA inspection: inspection is up to 15 s, it becomes +2 between 15 and 17 s, and DNF after that. You then execute it without pausing. Any cross can be solved in **8 moves or fewer**. Optimal averages are **5.81 HTM** on a fixed colour, **5.39** with dual colour neutrality and **4.81** with full colour neutrality.
  - Sources: [speedsolving wiki: Cross](https://www.speedsolving.com/wiki/index.php/Cross), [speedsolving wiki: Inspection](https://www.speedsolving.com/wiki/index.php/Inspection), [jperm.net Advanced Cross](https://jperm.net/3x3/cfop/cross)
- **Techniques.** J Perm's cross page progresses through these levels:
  - "Intermediate Cross Tips" (any level): see how cross pieces interact instead of solving them one at a time.
  - "Advanced Cross Tips" (sub-40): pattern-specific tricks.
  - X-Cross (sub-20).
  - Predicting the first pair (sub-15).
  - At sub-12, his advice is to:
    - choose cross solutions for better fingertricks
    - do more X-Crosses
    - change the cross to set up easier F2L cases
    - predict the first pair within 15 s on hard scrambles
    - roughly track the second pair on easy scrambles

  Source: [jperm.net/3x3/cfop/cross](https://jperm.net/3x3/cfop/cross).
- **Cross on bottom.** "Virtually all top CFOP solvers nowadays solve the cross on bottom to avoid doing a z2 or x2 cube rotation" ([speedsolving wiki: CFOP method](https://www.speedsolving.com/wiki/index.php/CFOP_method)). Cross-on-bottom also gives visibility for F2L lookahead ([wiki: Cross](https://www.speedsolving.com/wiki/index.php/Cross)). Beginners who solve the cross on top should switch early.
- **Inspection drills** for the app *(synthesis, built on sourced tools)*:
  1. **8-move challenge.** Show a scramble, have the user type or plan a cross, then compare its length with the optimal cross. Tools for this exist: [SpeedCubeDB cross trainer](https://www.speedcubedb.com/cross), and the "Just Another Rubik's Cube Solver" optimal-cross solver linked from the wiki Cross page.
  2. **Blind cross.** Inspect up to 15 s, then the cube or screen is hidden and the user executes the cross. Check with a smart cube or self-report.
  3. **Easy cross / easy XCross scrambles.** These build confidence with extensions. csTimer has `easy cross` and `easy xcross` scramble types ([csTimer en-us.js](https://github.com/cs0x7f/cstimer/blob/master/src/lang/en-us.js)).
  4. **Unlimited-inspection first-pair prediction.** J Perm recommends practising with unlimited inspection "to force yourself to predict 1 F2L pair" ([jperm.net cross](https://jperm.net/3x3/cfop/cross)).
  5. **Inspection timer** with a +2 or DNF warning at 15 and 17 s.

### 1.2 Colour neutrality (CN)

- **Types** ([speedsolving wiki: Color neutrality](https://www.speedsolving.com/wiki/index.php/Color_Neutrality)):
  - **fixed orientation**
  - **y-CN**: one cross colour
  - **x2y-CN**: also called dual, double or opposite CN; one colour pair, top or bottom
  - **full CN**: any colour
  - Notable full-CN cubers: Feliks Zemdegs, Max Park, Seung-Hyuk Nahm. Notable dual-CN cubers: Mats Valk, Philipp Weyer, Erik Akkersdijk.
- **Benefit** (Feliks, [CubeSkills blog: Colour Neutrality](https://www.cubeskills.com/blog/colour-neutrality)):
  - Optimal cross is 4.81 moves CN vs 5.81 fixed.
  - The bigger gain is easy crosses: crosses of 4 moves or fewer happen 29.17% of the time with CN vs 5.99% fixed.
  - Dual CN gives "approximately 50% of the benefits" for much less work.
  - It is "not the thing that's going to make you improve incredibly quickly". You don't **need** it, and long-time single-colour solvers may find switching very hard.
- **How to learn:**
  - Start as early as possible.
  - Add one colour at a time: get it automatic, then alternate it with your old colour.
  - Or follow Seung-Hyuk Nahm and do separate per-colour sessions (he did 100 solves per colour daily), then mix.
  - Learn to see patterns, not colours.
- **Who** *(synthesis)*: anyone below about sub-25 who is willing should go dual-CN now. Full CN is optional and best adopted early.
- **App idea:** colour-restricted scramble sessions (for example, "only blue/green cross"), plus per-colour split stats.

### 1.3 XCross / Cross+1

- **What it is.** Cross plus the first F2L pair, planned in inspection. It was proposed as a single inspection phase by Chris Hardwick in 2003. Strictly, "XCross" means block-building the state (for example 2x2x2 then the cross edges), while "Cross+1" means cross then a pre-planned pair. Both reach the same state, and Cross+1 is usually more ergonomic. XXCross and beyond are rare. Source: [speedsolving wiki: XCross](https://www.speedsolving.com/wiki/index.php/XCross).
- **Who.** Sub-20 per J Perm, who adds "You should not use this every solve". The next skill is predicting the first pair (sub-15). Source: [jperm.net cross](https://jperm.net/3x3/cfop/cross).
- **Resources:**
  - J Perm "Full Advanced Cross Playlist", linked from [jperm.net/3x3/cfop/cross](https://jperm.net/3x3/cfop/cross)
  - Chris Hardwick's "Solving the extended cross", linked from the wiki XCross page
  - csTimer `easy xcross` scrambles

---

## 2. F2L extensions and last-slot (LS) techniques

### 2.1 Keyhole

- **What it is.** You use an empty slot (a "working corner" or empty edge position) to insert pieces without first pairing them. For example, with a corner slot empty, an E-slice edge goes in with `R U' R'` or `F U F'`. It is mostly an LBL-to-F2L bridge, but the idea of inserting through a free slot is still used situationally in CFOP. Variants: edges-first keyhole, 8355. Source: [speedsolving wiki: Keyhole F2L](https://www.speedsolving.com/wiki/index.php/Keyhole).
- **Who** *(synthesis)*: beginners moving from LBL to F2L, and intermediate solvers as a situational trick. No algs to train, so low app value.

### 2.2 Winter Variation (WV / WVLS), 27 cases. **`wv.json` provided**

- **What it is.** Proposed by Lucas Winter in 2005. The setup:
  - The LL edges are already oriented (cross on top).
  - The last pair is connected in the U layer and can be inserted with `R U' R'`.
  - WV inserts the pair **and orients all LL corners**, forcing a PLL.

  There are 27 algs, one per corner-orientation state, or 54 with left-hand mirrors. Average optimal length is 8.07. Recognition looks at 3 of the U-layer corners, since the 4th is determined. WV is a subset of VLS.
  - Sources: [speedsolving wiki: Winter Variation](https://www.speedsolving.com/wiki/index.php/Winter_Variation), [jperm.net/algs/wv](https://jperm.net/algs/wv) ("This only works if the pair can be inserted with R U' R'")
- **When in a solve.** At the last slot, only when the LL edges are already oriented and the pair is the `R U' R'` insert. The edges-oriented condition happens in about 1 in 8 solves (wiki: ZBLL). Partial edge control raises that (see 2.8).
- **Prerequisites.** Full OLL, and especially the OCLL cases, so you can fall back.
- **Groups (J Perm naming)** = number of LL corners already showing the top colour:
  - 3 corners: 1 case
  - 2 corners: 6 (Rectangle, Snake, Tank)
  - 1 corner: 12 (Gun, Bowtie, Adjacent)
  - 0 corners: 8 (Sune, Pi, H)
- **Learning order** *(synthesis)*:
  1. Cases with very short algs: `R U' R'` (O/Rectangle), `R U R' U' R U' R'`, `U R U2 R'`, `U R U' R' U R U2 R'`, `R2 D R' U' R D' R2`.
  2. Then the remaining cases by group, 2 corners, then 1, then 0.
  3. Last, the left-hand mirrors.

  The VLS wiki says to learn WV first, before the rest of VLS.
- **Benefit / who** *(synthesis)*: modest. It saves an OCLL look-and-execute in a small share of solves. Worth it around sub-15 once full OLL/PLL are solid, and it is a cheap set. J Perm lists WV as the "Advanced" step after OLL.
- **Resources:**
  - [jperm.net/algs/wv](https://jperm.net/algs/wv): list plus trainer
  - [SpeedCubeDB WV](https://www.speedcubedb.com/a/3x3/WV): community-voted algs, setups, numbered WV 1–27
  - [CubingApp Winter Variation](https://www.cubingapp.com/algorithms/Winter-Variation)
  - csTimer `WVLS` scramble type
  - [Rouxles Alg-Trainer](https://github.com/Rouxles/Alg-Trainer): supports WV

### 2.3 Summer Variation (SV), 27 cases

- **What it is.** The counterpart to WV for the `R U R'` insert, when the pair is not connected but can be paired and inserted with `R U R'`. It orients the LL corners with the edges already oriented. SV is a subset of HLS. It was published by Chester Lian; the HLS wiki page gives both 2006 and 2009. Sources: [speedsolving wiki: HLS](https://www.speedsolving.com/wiki/index.php/HLS), [SpeedCubeDB SV](https://www.speedcubedb.com/a/3x3/SV) (27 cases listed).
- **Who** *(synthesis)*: after WV, if you like the last-slot approach. Same frequency caveats as WV.
- **App:** a candidate for a later `sv.json`. SpeedCubeDB lists all 27 with setups, so it can be verified the same way as WV.

### 2.4 VLS (Valk Last Slot), 432 cases (216 without mirrors)

- **What it is.** Inserts a connected last pair (with `[U] R U' R'` or `L' U L`) while doing the **full OLL**, edges included. It has 8 subsets named after which LL edges are misoriented: **WV, UF, UL, UB, UFUL, ULUB, UFUB, no-edges**, each with 54 cases including mirrors.
  - History: Mats Valk generated the algs privately in 2009. Rowe Hessler rediscovered and published them as "RLS" in 2013. algdb called the set "VRLS", and it is now "VLS".
  - Optimal average is 8.76 HTM, saving about 4.35 moves vs pair + OLL.
  - Sources: [speedsolving wiki: VLS](https://www.speedsolving.com/wiki/index.php/VLS), [SpeedCubeDB VLS](https://www.speedcubedb.com/a/3x3/VLS)
- **Who.** Enthusiasts and top solvers. The wiki estimates at least a year at 1 alg/day. Learn WV first, then the other subsets in any order. CubeSkills offers an **"Easy VLS" subset** PDF by Feliks and Mats ([easy-vls-algorithms.pdf](https://cubeskills.com/uploads/pdf/tutorials/easy-vls-algorithms.pdf)).
- **Note:** jperm.net's `/algs/vls` and `/algs/zbll` menu items currently return "Page Not Found".

### 2.5 HLS (Hessler Last Slot), 432 incl. mirrors; OLS (17,712)

- **HLS** is the `R U R'` counterpart of VLS, with subsets SV, UF, UL, UR, UFUR, UFUL, ULUR, 0. Optimal average is 9.58 HTM. As of 2018 most HLS algs beyond SV and "0" were unpublished. Source: [wiki: HLS](https://www.speedsolving.com/wiki/index.php/HLS).
- **OLS** (Orientation of the Last Slot) is the umbrella term for any LS+OLL. It covers 17,712 algs, or 864 for VLS+HLS. The OLS page maps every named subset to F2L case numbers:
  - CLS O = "Autumn Variation"
  - EJLS, VHLS, ZBLS, ELS, JJLS, OCLS, TSLE
  - Source: [wiki: OLS](https://www.speedsolving.com/wiki/index.php/OLS)

### 2.6 MGLS: ELS (21) + CLS (104)

- **What it is.** Makisumi–Garron Last Slot (2006) has two steps:
  1. **ELS** inserts the F2L edge and orients the LL edges (21 cases).
  2. **CLS** inserts the F2L corner and orients the LL corners, when edges are already oriented (104 cases).

  Sources: [wiki: MGLS](https://www.speedsolving.com/wiki/index.php/MGLS), [wiki: ELS](https://www.speedsolving.com/wiki/index.php/ELS), [wiki: CLS](https://www.speedsolving.com/wiki/index.php/CLS)
- **CLS subgroups** (by the position of the slot corner):
  - C: oriented in slot, 7 cases (= OCLL)
  - I: twisted cw in slot, 8 (EJLS+)
  - Im: twisted ccw in slot, 8 (EJLS−)
  - +: cw in the U layer, 27
  - −: ccw in the U layer, 27
  - O: oriented in the U layer, 27 (= "Autumn Variation")
- **Who** *(synthesis)*: CFOP users can pick up **CLS I/Im (EJLS)** and **CLS O** situationally once WV is done. Full MGLS is mostly used in ZZ and Petrus.
- **Resources.** [SpeedCubeDB CLS](https://www.speedcubedb.com/a/3x3/CLS) lists 97 cases in 4 groups: cross colour facing front, right or up, plus "trapped corner". csTimer has no CLS-specific type. The [Rouxles Alg-Trainer](https://github.com/Rouxles/Alg-Trainer) supports CLS. No JSON yet, because the count on the site (97) doesn't match the wiki (104), so it would need a careful reconciliation pass.

### 2.7 ZBLS / EOLS (formerly ZBF2L), 302 cases

- **What it is.** Inserts any last pair **and orients the LL edges**, so the LL is always a ZBLL. The set covers 302 cases, or 125 algs counting inverses and mirrors as the same alg. Together with ZBLL that makes 795 algs. **VHLS** is the subset where the pair is already made. Source: [wiki: ZBLS](https://www.speedsolving.com/wiki/index.php/ZBLS).
- **Who.** ZB-method users, and only "a handful of cubers" know it fully. csTimer has `ZBLS` and `EOLS` scramble types.

### 2.8 Last-slot edge control ("partial edge control") and corner control

- **What it is.** You pick how to insert the last pair so that the LL edges come out oriented. Examples are choosing between `R U R'`, `R U' R'`, sledgehammer or `F'`-based inserts, and `U`-move timing. This avoids the dot OLLs and sets up COLL, WV or ZBLL more often. It is mostly intuitive. **ELS** (21 cases, above) is the fully algorithmic version. **Partial corner control** does the same for corners and is used by COLL/OCLL users. Forum users report occasional dot cases, for example about once in 50 solves for one solver.
  - Sources: [wiki: ELS](https://www.speedsolving.com/wiki/index.php/ELS) (links "Partial Edge Control"), speedsolving threads on [partial corner control](https://www.speedsolving.com/goto/post?id=230379) and [edge control during F2L](https://www.speedsolving.com/goto/post?id=789921)
- **Who** *(synthesis)*: sub-15 CFOP solvers, or anyone learning COLL, WV or ZBLL, since edge control is what makes those sets appear.
- **App idea** *(synthesis)*: a "last-slot EO" quiz. Show an LS state and ask the user to choose the insert that orients the edges, then check with the simulator.

---

## 3. Last layer

### 3.1 OCLL (7) and EPLL (4)

These are the 2-look sub-steps. OCLL orients the corners when the edges are oriented. EPLL is the 4 edge-only PLLs: Ua, Ub, H, Z. They are what COLL and WV leave you with, so they belong in the core app already. Sources: [wiki: OCLL](https://www.speedsolving.com/wiki/index.php/OCLL), [wiki: EPLL](https://www.speedsolving.com/wiki/index.php/EPLL).

### 3.2 COLL (Corners of the Last Layer), 42 cases. **`coll.json` provided**

- **What it is.** Proposed by Lars Petrus. When the LL edges are oriented after F2L (cross on top), COLL orients **and permutes** the LL corners in one alg, leaving only EPLL. It has **42 cases**, 24 without mirrors:
  - 40 non-trivial cases across the 7 OCLL shapes: H 4, Pi 6, U 6, T 6, L 6, Sune 6, Antisune 6
  - 2 cases where the corners are already oriented but swapped, adjacent or diagonal
  - Average optimal length is 9.78 HTM.

  Sources: [wiki: COLL](https://www.speedsolving.com/wiki/index.php/COLL), [jperm.net/algs/coll](https://jperm.net/algs/coll)
- **When in a solve.** At OLL time, only when the LL edges are already oriented (about 1 in 8 solves, more with edge control). Because the edges are oriented, the PLL that follows is always an EPLL, which is easy to recognise and fast. The EPLL skip chance after COLL is 1/12 ([wiki: ELL](https://www.speedsolving.com/wiki/index.php/ELL)).
- **Prerequisites.** Full OLL (at least OCLL) and full PLL (at least EPLL).
- **Who / benefit:**
  - J Perm frames COLL as an advanced extension of OLL. His trainer **trashes Sune and Antisune by default** "as their COLL algorithms are too slow to be worth using" ([jperm.net/algs/coll](https://jperm.net/algs/coll)).
  - Forum consensus: COLL is mainly worth it if you plan to go on to ZBLL, since it is the standard primer. For pure CFOP, OCLL+PLL is about as fast on average ([speedsolving: What COLL subsets are worth learning](https://www.speedsolving.com/threads/what-coll-subsets-are-worth-learning.86828/latest)).
  - *(synthesis)* Sub-12 to sub-10 solvers, or anyone committed to ZBLL.
- **Learning order** *(synthesis consistent with J Perm's defaults)*:
  1. H (4)
  2. Pi (6)
  3. U (6)
  4. T (6)
  5. L (6)
  6. Optionally Sune and Antisune. They are short anyway, and Sune or Antisune followed by PLL is already fast.
- **Recognition.** Read the OCLL shape, then compare the side colours of the corners: headlights, adjacent colours or opposite colours. The same corner-sticker relations drive ZBLL recognition.
- **Resources:**
  - [jperm.net/algs/coll](https://jperm.net/algs/coll): trainer with Balanced/Realistic modes and trash
  - [SpeedCubeDB COLL](https://www.speedcubedb.com/a/3x3/COLL)
  - [CubeSkills COLL PDF](https://cubeskills.com/uploads/pdf/tutorials/coll-algorithms.pdf)
  - [CubingApp COLL](https://www.cubingapp.com/algorithms/COLL)
  - csTimer `COLL` scrambles

### 3.3 OLLCP (OLL + Corner Permutation), 331 cases

- **What it is.** Orients the whole LL and solves the corner permutation, so only EPLL remains. Alternative names are CLLEO, CEOLL and OCPLL. There are 331 algs, averaging about 11 moves. COLL is the subset where the edges are oriented, and CLLEF the subset where no edges are oriented. "Only a very few number of people use the full set". The advice is to learn only the nice, fast cases, since "a slow OLLCP plus a U perm is probably slower than a fast 'normal' OLL".
  - Sources: [wiki: OLLCP](https://www.speedsolving.com/wiki/index.php/OLLCP), [SpeedCubeDB OLLCP](https://www.speedcubedb.com/a/3x3/OLLCP), [cubinghistory OLLCP](https://cubinghistory.com/3x3/Steps/OLLCP) (first mentioned in 2005, named around 2010)
- **Who** *(synthesis)*: sub-10 enthusiasts, picking cases selectively. One useful mini-idea is learning **one alternate alg per common OLL that avoids diagonal-swap PLLs** (N/V/Y/E). That is the realistic form of "PLL control".
- **Resources:** [CubingApp OLLCP](https://www.cubingapp.com/algorithms/OLLCP), SpeedCubeDB OLLCP 1–57, Rouxles Alg-Trainer.

### 3.4 ZBLL, 472 cases (493 with the 21 PLLs)

- **What it is.** Solves the **entire LL in one alg when the edges are already oriented**. Lars Petrus proposed solving the LL in one step, and Bernard Helmstetter generated the algs (2002). Average optimal length is 12.08 HTM. The wiki counts 493 including PLL. Source: [wiki: ZBLL](https://www.speedsolving.com/wiki/index.php/ZBLL).
- **Subset sizes** (counted on SpeedCubeDB):

  | Subset | Cases |
  |---|---|
  | T | 72 |
  | U | 72 |
  | L | 72 |
  | H | 40 |
  | Pi | 72 |
  | S | 72 |
  | AS | 72 |
  | **Total** | **472** |
  | + PLL ("O" set) | 21 → 493 |

  Sources: [SpeedCubeDB ZBLLT](https://www.speedcubedb.com/a/3x3/ZBLLT) and the [/ZBLLU](https://www.speedcubedb.com/a/3x3/ZBLLU), [/ZBLLL](https://www.speedcubedb.com/a/3x3/ZBLLL), [/ZBLLH](https://www.speedcubedb.com/a/3x3/ZBLLH), [/ZBLLPi](https://www.speedcubedb.com/a/3x3/ZBLLPi), [/ZBLLS](https://www.speedcubedb.com/a/3x3/ZBLLS), [/ZBLLAS](https://www.speedcubedb.com/a/3x3/ZBLLAS) pages.

  Each OCLL set splits into its 6 COLL cases (4 for H), and each COLL case has **12 edge permutations**.
- **Recognition** ([wiki: ZBLL](https://www.speedsolving.com/wiki/index.php/ZBLL)):
  1. Identify the OCLL shape.
  2. Identify the COLL case.
  3. Identify the edge cycle.

  For T, U and L (216 algs), look at the UFR corner and the stickers next to it. Each FU/FRU and RU/RUF pair is classed as **C**olour-match, **A**djacent or **O**pposite, which gives 9 combinations plus the special cases C/OX, O/CX and OppX: 12 in all. Other methods include blocks, "Twisty-PLL" and BH (Baum-Harris) recognition; see the speedsolving thread [best ZBLL recognition methods](https://www.speedsolving.com/threads/best-zbll-recognition-methods.85062/latest).
- **Who / benefit.** Only about 1 in 8 solves gets an oriented-edge LL without edge control. "Only a handful of people have ever learned this step in its entirety". Learn OCLL/PLL or COLL/EPLL first as a fallback. Many skip S and AS because those OLLs are already short. *(synthesis)* This is realistic only for solvers at roughly sub-9 who have already maxed out F2L. Forum users warn that you can sink hundreds of hours and gain little over F2L practice.
- **Subset learning order.** There is no standard order. Common forum suggestions:
  - **U → T → L → Pi → H**, with S/AS last or never
  - or **T/U together → L → Pi → H → S/AS**

  Sources: [speedsolving: How to learn ZBLL](https://www.speedsolving.com/posts/1663601/), [ZBLL wiki](https://www.speedsolving.com/wiki/index.php/ZBLL). *(synthesis)* Within a subset, learn one COLL case (12 algs) at a time, and drill recognition separately from execution.
- **Resources:**
  - [bestsiteever.net/zbll](https://bestsiteever.net/zbll/): the best-known ZBLL trainer. Forum users say to use it for the trainer and take algs from current sheets.
  - [SpeedCubeDB ZBLL](https://www.speedcubedb.com/a/3x3/ZBLL)
  - [CubingApp ZBLL](https://www.cubingapp.com/algorithms/ZBLL)
  - csTimer `ZBLL` / `ZBLLx2`
  - [Rouxles Alg-Trainer](https://github.com/Rouxles/Alg-Trainer)
- **App:** too large to ship whole at first. A later phase could import one subset at a time (for example ZBLL-U) from SpeedCubeDB and verify it with the same simulator. ZBLL algs must solve the LL completely, modulo AUF.

### 3.5 ZZLL (169), 2GLL (84) and other ZBLL subsets

- **ZZLL** is the subset of ZBLL where two opposite LL edges are already permuted. It has 169 cases and needs at least 80 algs if mirrors and inverses are reused. It is used in ZZ-b and is described as "a useful transition between COLL/EPLL and full ZBLL". Source: [wiki: ZZLL](https://www.speedsolving.com/wiki/index.php/ZZLL).
- **2GLL** is the subset of ZBLL with the corners already permuted, solvable ⟨R,U⟩, and is popular for OH. It has 84 cases: 12 edge permutations × 7 OCLL shapes, with H smaller due to symmetry. Sources: [cubinghistory 2GLL](https://cubinghistory.com/3x3/Steps/2GLL) and the speedsolving threads cited there.
- csTimer has `ZZLL` and `2GLL` scramble types ([csTimer en-us.js](https://github.com/cs0x7f/cstimer/blob/master/src/lang/en-us.js)).

### 3.6 1LLL (full one-look last layer)

- There are 3915 LL cases modulo pre/post AUF, excluding solved. Counts vary depending on whether mirrors and inverses are merged; Helmstetter's table has about 1211–1212. Nobody uses full 1LLL. Sources: [speedsolving post](https://www.speedsolving.com/goto/post?id=138912) and the ["last layer number of positions" thread](https://www.speedsolving.com/goto/post?id=192438).
- **"1LLL subsets"** are partial sets, organised per OLL case, that you learn so the LL is solved in one look for that OLL. For a ranked, quantitative look at which OLLs give the best 1LLL value, see [speedsolving: Most worth-it 1LLL sets ranked](https://www.speedsolving.com/threads/most-worth-it-1lll-sets-ranked-quantitative-speed-comparison-between-olls-and-their-average-1lll-alg-how-to-learn-1lll.88685/).
- **"Anti-PLL" / "PLL+1".** I found **no primary source** that defines these as named algorithm sets. The closest established ideas:
  - OLLCP / COLL: control the corner permutation so you get an easier PLL (always EPLL)
  - Per-OLL 1LLL subsets
  - "OLL with alternate algs" to dodge N/E/V/Y perms

  Treat these names as user or informal terms. Don't build features around them unless the user supplies a definition.
- **"OLL skip" tricks.** The established ways to force or increase OLL skips:
  - WV / SV / VLS / HLS / OLS
  - CLS O ("Autumn Variation") and EJLS
  - Partial edge control (edges only)

  See section 2.

### 3.7 ELL (29) and CMLL (42): not CFOP, for completeness

- **ELL** solves all LL edges while preserving the corners, after CLL. It has 29 cases: 3 pure flips, 4 EPLLs, and the 3-cycles. It is used in CLL/ELL methods and in BLD. Source: [wiki: ELL](https://www.speedsolving.com/wiki/index.php/ELL).
- **CMLL** is Roux step 3. It solves the LL corners ignoring the M-slice, with 42 cases (Gilles Roux, 2003), and always has a lower movecount than COLL. Source: [wiki: CMLL](https://www.speedsolving.com/wiki/index.php/CMLL). It is not part of CFOP, so it doesn't belong in a CFOP trainer.

---

## 4. Recognition, prediction and probabilities

### 4.1 AUF prediction and 2-sided PLL recognition

- J Perm's "Last Layer Optimization" (sub-15) covers **recognising AUF**, reducing regrips, turning faster and changing algs ([jperm.net/3x3/cfop/ll](https://jperm.net/3x3/cfop/ll)). His PLL note: "Recognize G perms with headlights (solved corners) on the left, and find where the block is" ([jperm.net/algs/pll](https://jperm.net/algs/pll)).
- **2-sided recognition** means identifying the PLL (and its pre-AUF) from just the two visible faces, without looking around the cube. SpeedCubeDB has a dedicated **2-Sided PLL Recognition** trainer at [speedcubedb.com/t/pllrecog](https://www.speedcubedb.com/t/pllrecog).
- **App ideas** *(synthesis)*:
  1. A 2-sided PLL recognition quiz: show 2 faces, then ask which PLL it is and which AUF.
  2. A post-AUF prediction quiz: show the 2-sided PLL state and ask which U-move finishes the solve after the alg.
  3. Pre-AUF minimisation: pick the alg variant (for example `y` vs `U`) that avoids an AUF.

  The simulator used for the JSON verification can render all of these.

### 4.2 PLL prediction during OLL

*(synthesis, concept)* While executing OLL, track the corners or edges whose final positions you can infer. A common case is knowing the corner-permutation outcome of Sune/Antisune-type OLLs from the visible corner stickers. This lets you start PLL with no recognition pause. Two formal routes make this deterministic:

- COLL/OLLCP, which control the corners
- CP-recognition before OLL, the main benefit forum users attribute to COLL ("The only thing you gain from it is recognising the CP", per the [COLL-worth-it thread](https://www.speedsolving.com/threads/what-coll-subsets-are-worth-learning.86828/latest))

For the app, a "predict the PLL" quiz could show the pre-OLL LL plus the OLL alg and ask which PLL results.

### 4.3 Skip probabilities

| Event | Probability | Source |
|---|---|---|
| OLL skip (random LL) | 1/216 | [speedsolving Probability Thread](https://www.speedsolving.com/goto/post?id=401903) and replies |
| PLL skip | 1/72 | same thread |
| Full LL skip (no AUF counted) | 1/15552 = 1/216 × 1/72 | same thread |
| LL edges oriented after F2L (COLL/WV/ZBLL eligible) | about 1/8 | [wiki: ZBLL](https://www.speedsolving.com/wiki/index.php/ZBLL) ("only shows up 1 in 8 solves") |
| EPLL skip after COLL | 1/12 | [wiki: ELL](https://www.speedsolving.com/wiki/index.php/ELL) ("probability of all edges being permuted is 1/12") |
| Cross of 4 moves or fewer, full CN vs fixed | 29.17% vs 5.99% | [CubeSkills colour neutrality](https://www.cubeskills.com/blog/colour-neutrality) |

---

## 5. Suggested progression

All of this section is *(synthesis)* from J Perm's level tags and the forum and wiki guidance above.

| Level | Focus |
|---|---|
| sub-40 to sub-25 | full PLL (J Perm: sub-45), full OLL (J Perm: sub-25), cross efficiency (8-move rule), dual-CN if willing |
| sub-20 | XCross on easy scrambles, lookahead, cross-on-bottom everywhere |
| sub-15 | first-pair prediction, F2L optimisation, AUF/2-sided PLL recognition, **WV (27)**, partial edge control |
| sub-12 | **COLL** (H/Pi/U/T/L first), SV, CLS-O/EJLS situationally, more XCrosses |
| sub-10 and below | ZBLL subsets (U/T/L → Pi → H), selective OLLCP, VLS subsets |

**Recommended app scope:**

- **v1:** cross and inspection drills, plus COLL, WV and 2-sided PLL recognition.
- **v2:** SV, CLS-O/EJLS, ZBLL-U/T/L imported from SpeedCubeDB and verified.

Skip HLS, OLS, full 1LLL and ZBLS.

---

## 6. Trainers and resources index

| Resource | What | URL |
|---|---|---|
| J Perm alg pages and trainers | OLL, PLL, COLL, WV (+ OH, 2x2…) | https://jperm.net/algs/coll, https://jperm.net/algs/wv |
| J Perm Advanced CFOP pages | Level-tagged advice (cross / F2L / LL) | https://jperm.net/3x3/cfop/cross, /f2l, /ll |
| SpeedCubeDB | Community-voted algs with setups for COLL, WV, SV, VLS, CLS, OLLCP, ZBLL (per subset), ELL, CMLL; cross trainer; 2-sided PLL trainer | https://www.speedcubedb.com/a/3x3/COLL, https://www.speedcubedb.com/cross, https://www.speedcubedb.com/t/pllrecog |
| CubeSkills | COLL PDF, Easy VLS PDF, colour-neutrality blog | https://cubeskills.com/uploads/pdf/tutorials/coll-algorithms.pdf, https://cubeskills.com/uploads/pdf/tutorials/easy-vls-algorithms.pdf, https://www.cubeskills.com/blog/colour-neutrality |
| bestsiteever ZBLL trainer | ZBLL recognition and execution trainer | https://bestsiteever.net/zbll/ |
| CubingApp | Alg pages for COLL, Winter Variation, OLLCP, ZBLL | https://www.cubingapp.com/algorithms/COLL |
| csTimer | Subset scrambles: PLL, OLL, LSLL, ZBLL, ZBLLx2, COLL, CLL, ELL, 2GLL, ZZLL, ZBLS, EOLS, WVLS, VLS, cross solved, easy cross, easy xcross | https://cstimer.net (list from https://github.com/cs0x7f/cstimer/blob/master/src/lang/en-us.js) |
| Rouxles Alg-Trainer (GitHub) | Open-source trainer: PLL, OLL, F2L, COLL, WV, ZBLL, 2GLL, ZZLL, ZBLS, CLS, OLLCP, CMLL… | https://github.com/Rouxles/Alg-Trainer |
| speedsolving.com wiki | Definitions and case counts (blocked by Cloudflare for scripts; Wayback works) | https://www.speedsolving.com/wiki/ |
| algdb.net | Historic alg DB. The old `/puzzle/333/<set>` URLs now 404 | https://algdb.net |

---

## Data files (`coll.json`, `wv.json`)

**Schema.** Each file follows the requested schema:

```json
{
  "set": "...",
  "notation": "...",
  "cases": [
    {"id": "...", "name": "...", "group": "...", "algs": ["..."], "recognition": "...", "sources": ["..."]}
  ]
}
```

Each case also carries these extra fields:

- **`pre_auf`**: an array parallel to `algs`. It gives the number of clockwise `U` turns to apply to the case state, defined as `inverse(algs[0])` on a solved cube, **before** that alg. The primary is always 0. Alts copied from other sources often assume a different pre-AUF or begin with `y`/`y2`.
- **`scdb_case`** (WV only).
- File-level `description` and `notes`.

**Provenance:**

- **COLL**
  - Primary alg = jperm.net (`/lib/coll.js`, the data behind https://jperm.net/algs/coll). Alts = the top SpeedCubeDB algs for the same case.
  - Case numbering (H1–4, Pi1–6, U1–6, T1–6, L1–6, S1–6, AS1–6) matches both sites. I confirmed this by simulating each case's corner state.
  - O1 and O2 (the oriented adjacent and diagonal swaps) use the J Perm PLL page's T-perm and Y-perm algs.
- **WV**
  - Primary = jperm.net (`/lib/wv.js`). Every J Perm case is set up with the pair at front-left/UF so that `R U' R'` inserts it, with no pre-AUF.
  - Alts = SpeedCubeDB. Those algs mostly include their own leading `U`, so their `pre_auf` is 3.
  - `id` = SpeedCubeDB's WV number (WV01–WV27). `name` = J Perm's name, with `#n` added where J Perm reuses a name.
- **Edits to source algs.** The only edits are removing jperm's trigger-grouping parentheses and normalising whitespace. Algs using `Lw`-style notation, very long joke or alternative algs, and (for WV) any alg containing `x`, `y` or `z` were **dropped, not rewritten**.
- **Recognition text** is generated from the simulated case state: OCLL shape plus side-sticker relations for COLL, and corner twist directions plus the pair position for WV. It is not copied from a source.

**Verification.** I used an independent sticker simulator, whose move definitions I validated with these checks:

- `(R U)` order 105, `R U2 D' B D'` order 1260, T-perm order 2, Ua order 3
- `r = R M'` and the other wide/slice/rotation identities

Results:

- **COLL.** Every alg (with its `pre_auf`):
  - preserves F2L
  - leaves all LL pieces oriented
  - solves all LL corners modulo AUF
  - matches its group's OCLL shape (sanity check)
  - Every case's setup keeps F2L and LL edge orientation intact.
- **WV.** Every alg contains no rotations, and from the case state it:
  - solves the FR pair
  - keeps the rest of F2L
  - orients all LL pieces
  - In every case state, the other three slots are solved, FR is unsolved, and `R U' R'` alone inserts the pair with the LL edges oriented.
- **Mirrors.** Left-slot mirrors of WV are **not** included or verified.

**Source errata found during verification.** Worth knowing if the app ever loads jperm.net data directly:

1. jperm.net COLL **L5** `x R' U R D' R' U' R D` has no closing `x'`, so the cube ends up rotated. It was replaced by SpeedCubeDB's L5 algs. SpeedCubeDB has the corrected `... R D x'` form.
2. jperm.net COLL **S6**'s second alt `y2 R U' R' F' R U R' U' R' F R2 U' R' U2 R U' R'` solves an **Antisune** case, not S6. It was dropped.
3. jperm.net WV "Pi (Far)" has an unbalanced parenthesis in the source (`R U' R' (R' U2 R U R' U R`). It is harmless once parentheses are stripped.
