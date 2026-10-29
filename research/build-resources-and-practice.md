# Build resources and practice methodology for a CFOP trainer

Researched 2026-10-28. Versions and licenses were checked against npm and the GitHub API that day. Claims from forum anecdotes or search snippets are marked *(anecdotal)* or *(unverified)*. Companion doc: `existing-tools.md`.

---

# Part A: Technical building blocks

## A1. cubing.js (core library)

- **Repo:** https://github.com/cubing/cubing.js. **Docs:** https://js.cubing.net/cubing/.
- **npm:** `cubing` **v0.66.1** (modified 2026-10-16). Pre-1.0, and the docs warn that experimental APIs "will change before cubing.js version 1.0." Pin the exact version.
- **License:** `MPL-2.0 OR GPL-3.0-or-later`. Choose MPL-2.0: it is file-level copyleft, so changes to cubing.js files must be shared, but our app code can use any license. Vendored parts are Apache/MIT.
- **Requirements:** ES2022 modules. The search and scramble code runs in **module web workers**, which Vite handles fine. Node 22.3+ if used server-side.
- **Entry points** (from `package.json` `exports`): `cubing/alg`, `cubing/twisty`, `cubing/kpuzzle`, `cubing/puzzles`, `cubing/scramble`, `cubing/search`, `cubing/bluetooth`, `cubing/notation`, `cubing/protocol`, `cubing/stream`, `cubing/puzzle-geometry`.

### Alg parsing and manipulation (`cubing/alg`)
- `new Alg("R U R' U'")`, `.invert()`, `.concat()`, `.experimentalSimplify()`, `.expand()`, plus move counting via `cubing/notation`. Use these for normalising user-entered algs, inverting for setup, and mirroring (or write a small mirror map).

### Puzzle state (`cubing/kpuzzle`, `cubing/puzzles`)
```ts
import { cube3x3x3 } from "cubing/puzzles";
const kpuzzle = await cube3x3x3.kpuzzle();
const solved = kpuzzle.defaultPattern();
const p = solved.applyAlg("R U R' U R U2 R'");
p.experimentalIsSolved({ ignorePuzzleOrientation: true, ignoreCenterOrientation: true });
p.isIdentical(otherPattern);
```
`KPattern` methods (from the typings): `apply`, `applyAlg`, `applyMove`, `applyTransformation`, `isIdentical`, `experimentalToTransformation`, `experimentalIsSolved`, `toJSON`.

### Rendering (`cubing/twisty`)
`<twisty-player>` web component, also `new TwistyPlayer({...})`. Attributes in kebab-case, properties in camelCase (https://js.cubing.net/cubing/twisty/):

| Attribute | Use |
|---|---|
| `alg` | Moves to animate |
| `experimental-setup-alg` | Start state |
| `experimental-setup-anchor="end"` | Makes the alg *end* solved, the typical "show this case, then solve it" display. Experimental. |
| `visualization` | `3D` (default), `2D`, `experimental-2D-LL` (top-down LL diagram, good for OLL/PLL cards), `PG3D` |
| `experimental-stickering` | Grey out irrelevant stickers. Values found in the bundle: `full, OLL, PLL, LL, EOLL, COLL, OCLL, CPLL, CLL, EPLL, ELL, ZBLL, LS, LSOLL, LSOCLL, ELS, CLS, ZBLS, VLS, WVLS, F2L, Daisy, Cross, EO, EOline, EOcross, FirstBlock, SecondBlock, CMLL, L10P, L6E, L6EO, ...` Docs note Cross stickering currently assumes the D face. |
| `hint-facelets` | `none` or floating hint stickers |
| `back-view` | `none`, `side-by-side`, `top-right` |
| `control-panel` | `none` hides the scrubber |
| `background` | `none` for custom CSS |
| `camera-latitude`, `camera-longitude`, `tempo-scale` | Camera angle and playback speed |

The default size is 384×256, set via CSS. **Performance:** each 3D player is a WebGL context, and browsers cap contexts at roughly 16. For a 57-case OLL grid, render **static SVG images** (VisualCube / sr-visualizer, or `experimental-2D-LL` snapshots cached at build time) and use one live 3D player for the active case.

### Scrambles and search
- `randomScrambleForEvent("333")` from `cubing/scramble` gives a WCA-style random-state 3x3 scramble (runs in a worker). Use it for full-solve practice.
- `cubing/search` exports `experimentalSolve3x3x3IgnoringCenters(pattern: KPattern): Promise<Alg>`, `random333Pattern()`, `experimentalSolve2x2x2`, and solvers for pyraminx, skewb and megaminx. The 3x3 solver is a compiled **min2phase** (`search-dynamic-solve-3x3x3` chunk contains `min2phase.client.*`).

### Twizzle
- https://alpha.twizzle.net/edit/ is the shareable alg and reconstruction editor, successor to alg.cubing.net. We can deep-link "open in Twizzle" with `?alg=...&setup-alg=...`.

## A2. Generating a scramble that produces a given case

There are three approaches seen in the wild:

| Approach | Used by | Pros | Cons |
|---|---|---|---|
| **Inverse of the alg** | Many toy trainers | Trivial | The user can read the solution off the scramble; teaches nothing about recognition |
| **Precomputed scramble table per case** | bestsiteever ZBLL (`zbll_map_next.json`, bucketed by length, random y-relabelling picking the variant with fewer B moves) | Instant, no solver in the browser | Finite pool; large JSON; no license in that repo |
| **Constrained random state, then two-phase solve** | csTimer (`getAnyScramble(ep,eo,cp,co,neut,rndapp,rndpre)` with min2phase, rejects solutions ≤3 moves); Alg-Trainer (cubejs Kociemba); CubeRoot (min2phase.js); cubetrainer.cc (cubing.js) | Real-looking random-state scrambles; can randomise AUF, colour neutrality, the rest of the cube | Needs a solver (worker), plus a first-solve warm-up for tables |

**Recommended recipe with cubing.js** (sketch):
```ts
import { Alg } from "cubing/alg";
import { cube3x3x3 } from "cubing/puzzles";
import { experimentalSolve3x3x3IgnoringCenters } from "cubing/search";

const AUF = ["", "U", "U2", "U'"];
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

async function scrambleForCase(solvingAlg: string): Promise<Alg> {
  const kpuzzle = await cube3x3x3.kpuzzle();
  // State the user must solve: pre-AUF, then the case, then post-AUF.
  const setup = new Alg(`${pick(AUF)} ${solvingAlg} ${pick(AUF)}`).invert();
  const pattern = kpuzzle.defaultPattern().applyAlg(setup);
  const solution = await experimentalSolve3x3x3IgnoringCenters(pattern);
  return solution.invert(); // applying this to a solved cube yields `pattern`
}
```
- **OLL:** to stop the PLL from leaking via a fixed alg, randomise the permutation too. Apply `inverse(random PLL alg + AUF)` before the OLL setup, matching csTimer's "OLL training doesn't check permutation".
- **F2L / last slot:** start from a random LL (inverse of a random OLL + PLL + AUF), then apply the inverse of the F2L case alg. For "random F2L with other slots free", use csTimer-style masks instead (pieces wildcarded).
- **Cross / X-cross trainers with known difficulty:** generate random states and compute the optimal cross length with a small IDA* over the 4 cross edges (about 190k states; trivial). Bucket by length, then pick a bucket to drive a ladder (cubetrainer.cc: next length when ≥80% of the last 10 were optimal).
- Reject very short scrambles (csTimer rejects ≤3 moves) and **pre-generate the next scramble in the worker** while the user solves.
- **Rotations:** the solver ignores centres, so add a user-chosen pre-rotation (e.g. `z2` for yellow on top) or random `y` for colour-neutral practice. Alg-Trainer exposes exactly this.

### Alternative solvers (if not using cubing.js search)
| Lib | License | Notes |
|---|---|---|
| `min2phase.js` (https://github.com/cs0x7f/min2phase.js), npm `min2phase.js@0.0.4` | npm says `(MIT or GPL-3.0)`; the original Java min2phase README lists both GPLv3 and MIT | The solver csTimer and TNoodle use |
| `cubejs` (https://github.com/ldez/cubejs), npm 1.3.2 | MIT | Kociemba two-phase; used by Alg-Trainer; `Cube.initSolver()` takes a few seconds |
| `kociemba` (https://github.com/muodov/kociemba) | GPL-2.0 | Python/C, server-side only |

## A3. Case images: VisualCube and friends

- **Hosted VisualCube:** `https://visualcube.api.cubing.net/visualcube.php?...` (original PHP: https://github.com/Cride5/visualcube, **LGPL-3.0**). Parameters:
  - `fmt` (svg/png/gif/jpg), `size` (0-1024), `pzl`, `view` (`plan` for top-down LL, `trans`).
  - `stage`: one of `fl, f2l, ll, cll, ell, oll, ocll, oell, coll, ocell, wv, vh, els, cls, cmll, cross, f2l_3, f2l_2, f2l_sm, f2l_1, f2b, line, 2x2x2, 2x2x3`. There is no `pll` stage; use `ll`.
  - `alg`, `case` (shows the state the alg solves), `fd`/`fc` facelet definitions, `sch` colour scheme, `bg`, `cc`, `co`, `fo`, `dist`, `r` (rotation).
  - `arw` arrows, e.g. `arw=U0U2,U2U8,U8U0` for PLL arrows.
  - Example OLL card: `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&size=150&view=plan&stage=oll&case=R U2 R2 F R F' U2 R' F R F'`
- **Self-hosted / client-side:** `sr-visualizer` (https://github.com/tdecker91/visualcube, npm `sr-visualizer@1.0.13`, last publish 2022). Renders SVG or PNG in the browser with the same options (`cubeSVG(el, {view:'plan', case:'...', stage...})`). **License mismatch:** npm says ISC, the repo says LGPL-3.0 (it is a port of LGPL code), so treat it as LGPL. It is unmaintained; fine for a build step.
- **Recommendation:** generate all case SVGs **at build time** into static assets (one script over the alg dataset, using sr-visualizer or cubing.js `experimental-2D-LL`). That avoids depending on a hosted service, keeps the app offline-capable and sidesteps WebGL context limits.

## A4. WCA scrambles and TNoodle

- **TNoodle** (https://github.com/thewca/tnoodle, **AGPL-3.0**; scrambling library https://github.com/thewca/tnoodle-lib, GPL-3.0) is the only program allowed for official competitions ("must always use the current version of the official scramble program"). The 3x3 scrambler is min2phase-based.
- **Regulation 4b3:** "An official scramble sequence must produce a random state from all states that require at least 2 moves to solve" (https://www.worldcubeassociation.org/regulations/).
- For a practice app, cubing.js `randomScrambleForEvent("333")` gives the same distribution (random-state plus two-phase). Label scrambles "random-state, not competition-official".
- **Licensing note:** GPL scramblers are incompatible with the iOS App Store. TPS Cube wrote MIT scramblers for that reason (https://github.com/D0ntPanic/tpscube). A web app has no such issue.

## A5. Web Bluetooth smart cubes

- **Browser support:** Chrome, Edge and Opera on desktop and Android only. **No Firefox, no Safari (macOS or iOS).** iOS users need **Bluefy** (https://apps.apple.com/ma/app/bluefy-web-ble-browser/id1492822055). Requires HTTPS and a user gesture for `navigator.bluetooth.requestDevice` (overview: https://www.beaconzone.co.uk/blog/browser-support-for-web-bluetooth/).
- **Library options:**
  - **`smartcube-web-bluetooth`** (https://github.com/poliva/smartcube-web-bluetooth, **MIT**, active 2026-10). The best multi-vendor option: GAN Gen1-4 (incl. 2x2), Giiker/Mi, GoCube/Rubik's Connected, MoYu (AI 2023, MHC, WRM `WCU_MY3`, Weipo V5), QiYi, XMD Tornado V4; GAN timers. RxJS event stream with `FACELETS` (54-char URFDLB), `MOVE`, `GYRO` (quaternion) and `BATTERY` events; `conn.capabilities` flags. Install from GitHub: `npm install poliva/smartcube-web-bluetooth`. Used by Cubedex and F2L Trainer.
  - **`gan-web-bluetooth`** (https://github.com/afedotov/gan-web-bluetooth, MIT, v3.0.2, 2024-08). GAN only; the predecessor of the above.
  - **`cubing/bluetooth`** `connectSmartPuzzle()` (https://js.cubing.net/cubing/bluetooth/). Compatibility table: GiiKER, GoCube, GAN (some versions incompatible), HEYKUBE, QiYi; **MoYu not working**. Also `connectSmartTimer`, and `KeyboardPuzzle` / `debugKeyboardConnect` for testing without hardware.
  - **csTimer drivers** (`src/js/hardware/*.js`, GPL-3.0) are a reference for protocols but GPL.
  - **QiYi protocol** write-up with Wireshark plugin: https://codeberg.org/Flying-Toast/qiyi_smartcube_protocol.
- **GAN encryption gotcha:** GAN Gen2+ encrypt traffic with a key salted by the cube's **MAC address**. Browsers don't expose MACs, so the library extracts it from advertisement manufacturer data via `device.watchAdvertisements()`. That API may need Chrome's experimental web platform features flag. If it fails, the library falls back to a `customMacAddressProvider` callback, so the UI must ask the user for the MAC (see `src/gan-smart-cube.ts`). Plan UX for this.
- **Pitfalls** (from the smartcube-web-bluetooth README): some 2x2 firmwares report D/L/B as U/R/F axis aliases; request device facelets before trusting physical state; protocols change with firmware, so keep a "mark as solved / resync" button (cubetrainer.cc does).
- **What smart cubes unlock:** automatic start and stop; per-move timestamps leading to **recognition time vs execution time per stage**, pause detection, TPS; auto case detection (match the LL pattern against a case table modulo AUF); verified alg execution (did they do the intended alg?); "next scramble from the current state" (cubetrainer.cc).

## A6. Open algorithm datasets

| Source | Content | License | Notes |
|---|---|---|---|
| **`@moishy/algsets`** on JSR (https://jsr.io/@moishy/algsets, repo https://github.com/moishy-r/moishy-cubing) | 16 sets: PLL 21, OLL 57, F2L 41×4 slots, Advanced F2L 136, COLL+EPLL 40, WV 27, SV 27, ZBLL 472, ZBLS 301, LXS, EO pair, etc. Typed TS; each case is `{id, name, algs[]}` with recognition state *derived* by applying the primary alg; `assertValidAlgSet` checks that algs solve the case | **MIT** | Best clean, machine-checked source found. v0.3.3 |
| **Alg-Trainer algsets** (https://github.com/tao-yu/Alg-Trainer) | Many LL/LS sets in JS | **MIT** | Older; good coverage |
| **csTimer case tables** (`scramble_333_edit.js`: `pll_map`, `oll_map`, F2L/LS tables) | Case *states* and names (e.g. `'Point-1'`, `'OCLL-21'`) and probabilities, not algs | GPL-3.0 | Use as a reference for case ids and probabilities, not code |
| **cubing/algdb** (https://github.com/cubing/algdb) | Code only (GraphQL backend); no data dump | GPL-3.0 | Inactive since 2021 |
| speedcubedb.com | The richest community-voted algs | No API, no export, terms unclear | Scrapers exist (`QuantumQream/SpeedCubeDB-WebScraper`); don't depend on it, given its outage history |
| bestsiteever `zbll_map_next.json` | Precomputed ZBLL scrambles and algs | **No license**, so all rights reserved | Don't copy |
| CubeSkills PDFs, jperm sheets | Curated alg sheets | Proprietary | Link, don't redistribute |

Short move sequences are widely treated as community knowledge, but curated compilations, images and recognition guides are someone's work. Ship our own dataset seeded from MIT sources, record a `source` per alg, and let users edit and add algs. (This is a practical view, not legal advice.)

**Suggested data model:** `Case { id, set: 'OLL'|'PLL'|'F2L'|..., group (e.g. 'T-shapes', 'Adjacent swaps'), name, probability (e.g. PLL H 1/72, Na 1/72), setupState (derived), algs: [{ moves, source, mcc?, stm }], userAlgIndex }`. Derive images and recognition data from `setupState`.

**Alg ranking:** use trangium's **MCC** (simulated execution cost) via the CubeRoot Batch Solver port (https://cuberoot.me/scramble/batch-solver, ported from trangium/BatchSolver, MIT) to rank alternative algs by ergonomics, not just move count.

## A7. Timer conventions (WCA rules plus community norms)

Source: WCA Regulations (https://www.worldcubeassociation.org/regulations/).

- **Inspection:** A3a1, "strictly less than 15 seconds to inspect." The solve must start within 15 s or it gets **+2** (A4d1). Exactly 15.00 also gets +2 (A4d1+). Starting at **≥17.00 s is a DNF** (A4d2, A4d2+). Implementation: a 15 s countdown with 8 s and 12 s voice or beep warnings (common in timers and judging); auto-apply +2 and DNF.
- **End-of-solve penalties:** misalignment tolerance is 45° for NxN (10f1). If one move is needed to solve, **+2** (10e3); more than one move is a **DNF** (10e4). Not releasing the puzzle before stopping the timer is +2 (A6c). Let the user toggle `OK / +2 / DNF` per solve and store the raw time plus penalty, not a mutated time.
- **Precision:** singles are **truncated** to hundredths; averages and means are **rounded** to the nearest hundredth (9f1). At 10 minutes or more, results go to whole seconds (9f2).
- **Ao5:** drop best and worst, mean of the middle 3 (9f8). **One DNF counts as the worst and is trimmed; two or more DNFs make the average DNF** (9f9).
- **Mo3:** plain mean; **any DNF means DNF** (9f10, 9f11).
- **Ao12 and larger (community, not WCA):** trim about 5% from each end. csTimer's default `p5` uses `ceil(n × 5/100)` per side, so ao12 trims 1+1, ao50 trims 3+3, ao100 trims 5+5 (`src/js/stats/timestat.js`). An average is DNF when the DNF count exceeds the trimmed-worst count. Speedsolving wiki confirms ao100 drops the 5 best and 5 worst.
- **Also show:** session mean (excluding DNFs) with DNF count, best single, best and current ao5/ao12/ao100, rolling-average graph, standard deviation, **BPA/WPA** (best or worst possible average for the in-progress ao5, from csTimer), daily stats, distribution histogram.
- **Splits:** store per-phase timestamps (`cross`, `f2l1..4`, `oll`, `pll`). For dumb cubes, offer csTimer-style multi-phase key taps. For smart cubes, detect phases automatically and split each into recognition (pause before the first move of the step) and execution.
- **Storage:** IndexedDB with JSON/CSV export and csTimer-compatible import, so users can migrate.

## A8. Spaced repetition for algorithms

### SM-2 (SuperMemo 2, 1987; https://super-memory.com/english/ol/sm2.htm)
- Quality scale q is 0-5. Intervals: I(1)=1 day, I(2)=6 days, I(n)=I(n−1)×EF.
- `EF' = EF + (0.1 − (5−q)(0.08 + (5−q)·0.02))`, with a floor of 1.3 and a starting EF of 2.5.
- If q < 3, restart the repetitions (I(1), I(2), ...) and leave EF unchanged.
- About 20 lines of code with no dependency. Weakness: a fixed formula with no per-user fitting, and it handles overdue reviews poorly.

### FSRS (Free Spaced Repetition Scheduler)
- Models **Difficulty, Stability and Retrievability** ("three component model of memory"). You set a **desired retention** (e.g. 0.9); parameters can be optimised on the user's own review log. Anki's FAQ says it needs fewer reviews than SM-2 for the same retention and handles long breaks better (https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm). Third-party estimates of the saving are about 20-30% *(varies by source)*.
- Benchmark (https://github.com/open-spaced-repetition/srs-benchmark, about 10k Anki collections, roughly 350M reviews): log loss for FSRS-6 is 0.346, FSRS-5 0.356, FSRS v4 0.373.
- **TS implementation:** `ts-fsrs` (https://github.com/open-spaced-repetition/ts-fsrs, **MIT**). npm `latest` = **5.4.2** (classic API: `createEmptyCard()`, `fsrs(params).repeat(card, now)` / `.next(card, now, Rating.Good)`, `Rating.Again|Hard|Good|Easy`, `request_retention`, `maximum_interval`, `enable_fuzz`, learning steps). `beta` = **6.0.0-beta.15**, a new `DefaultScheduler()` / `scheduler.review({card, grade, now})` API defaulting to FSRS-7, which requires Node ≥24. Start on 5.x.

### Adapting SRS to motor skills (design recommendation)
Algs are **procedural** memory (finger patterns) plus **declarative** recall (which alg goes with this picture). Flashcard SRS is built for the second. Use a hybrid:
1. **Grade from objective signals, not self-rating:**
   - **Again:** didn't remember, did the wrong alg, or DNF'd the case.
   - **Hard:** recognition time over target (e.g. >1.5 s), execution over 1.5× the user's personal median for that case, or a needed peek.
   - **Good:** correct, within target.
   - **Easy:** correct and recognition under 0.5 s and execution under the personal median.
   
   With a smart cube, all of this is automatic. Without one, use a two-tap timer (recognised, then done) plus a "peeked" button.
2. **Two loops.** The FSRS loop decides *which cases are due today* (cross-day memory). An in-session fluency loop repeats due and new cases until execution stabilises (like bestsiteever's 4×/3×/2× weighting for the worst cases). Interleave (randomise) within a session, not in blocks; see B6.
3. **New-card limits:** cap new algs per day (J Perm: PLL "at most 2 per day, and not every day"; Cubelelo: 2-3 OLL/day). Make the cap a setting with default 2-3.
4. **Leech handling:** a case that fails repeatedly gets suggested alternative algs (MCC-ranked), a trigger breakdown, and a user note (bestsiteever's personal notes).
5. **Real solves feed the scheduler.** When stage detection sees a slow OLL 33 in a full solve, treat it as a review (cubetrainer.cc and Cubeast already link real-solve cases to stats).

---

# Part B: Practice methodology

## B1. Who says what (primary sources)
- **CubeSkills / Feliks Zemdegs:** "How To Get Faster?" (https://www.cubeskills.com/blog/how-to-get-faster), "Lookahead Progression Framework" (https://www.cubeskills.com/blog/lookahead-progression-framework), "CFOP Solve Splits Tool" (https://cubeskills.com/blog/cfop-solve-splits-tool).
- **J Perm:** CFOP pages https://www.jperm.net/3x3/cfop, https://www.jperm.net/3x3/cfop/cross, https://www.jperm.net/3x3/cfop/f2l, https://www.jperm.net/3x3/cfop/ll; finger tricks at https://jperm.net/3x3/fingertricks.
- **Speedsolving.com and r/Cubers:** bot-blocked here. Content came via search snippets: practice-routine thread (https://www.speedsolving.com/threads/practice-routines-and-general-cubing-tips.88962/), PLL time attack thread (https://www.speedsolving.com/threads/pll-time-attack-discussion.8809/), lookahead discussion (https://www.speedsolving.com/threads/lookahead-discussion.7059/).
- **Tymon Kolasiński:** no first-party practice write-up found. Coverage notes heavy inspection planning and multi-pair prediction (https://www.thecubicle.com/blogs/thecubicle-blogs/five-cubers-one-scramble-from-beginner-to-professional; https://ruwix.com/blog/tymon-kolasinski-509-rubiks-cube-average-record/: 10.57 TPS on his fastest solve, first two pairs in 6 moves). His paid Cubing.GG course wasn't reviewed.
- **Max Park:** **no named coach found** in reliable sources; one site literally has a "[Coach's Name]" template placeholder. The best account (a lean-manufacturing consultant who observed him) describes **practice mirroring competition**: his own competition-style timer and logging every solve to a time log immediately (https://leanhorizons.com/what-makes-max-park-a-world-champion-the-rubiks-cube-from-a-lean-perspective/).
- **Research:** Boyce & Storm (2022), "Rubik's Cube: What separates the fastest solvers from the rest?", J. Emerging Investigators, DOI 10.59720/21-189 (https://emerginginvestigators.org/articles/21-189). Based on 69 frame-by-frame solve videos and a 1,385-cuber survey. Factors correlating with time: **regrip and rotation frequency, pause fraction, cross move count, number of algs known, turn speed, cross-to-F2L pause, and OLL/PLL recognition time**. A search snippet reported average turn rate as the strongest correlate (r ≈ −0.85) *(unverified; the PDF couldn't be parsed here)*.

## B2. Learning order and milestones (synthesised roadmap)

Sources disagree on details. This is the consensus picture with attributions. Times are 3x3 averages.

| Stage | Typical average | Learn | Practice focus | Sources |
|---|---|---|---|---|
| 0. Beginner (LBL) | 60s → ~1:00 | Beginner method, notation, **finger tricks early** | Get down to about 1 minute with the beginner method; avoid bad grip habits; **start colour neutrality now** (Feliks) | CubeSkills "How to get faster" |
| 1. Intro CFOP | 60 → 40 | **Intuitive F2L** (expect a temporary slowdown); **2-look OLL (10) + 2-look PLL (6)**, about 16 algs, "a few days" | Daily slow untimed solves; cross on bottom | J Perm CFOP; CubeSkills; Cubelelo |
| 2. | 45 → 30 | **Full PLL (21)**. J Perm: "Recommended for sub-45." Feliks: "Learn the PLL algorithms first, followed by the OLLs." | PLL recognition (2-sided), PLL time attacks | jperm.net/3x3/cfop/ll; CubeSkills |
| 3. | 30 → 20 | Advanced F2L (cases from all slots, back-slot inserts, fewer rotations); advanced cross (plan the whole cross in inspection, ≤8 moves) | **F2L lookahead is the bottleneck.** Cross planning; reduce F2L move count. J Perm moves to advanced material "around sub-30". | J Perm cross/F2L; Cubelelo sub-20 |
| 4. | 25 → 15 | **Full OLL (57)**. J Perm: "Recommended for sub-25"; others say full OLL is "helpful but not required" for sub-20. Predict the **first pair in inspection**. **X-cross** on easy scrambles (J Perm: for sub-20, "should not use this every solve") | Tracking-stage lookahead (CubeSkills); pair-to-pair transitions; AUF control | J Perm; CubeSkills |
| 5. | 15 → 10 | Easy algs from WV, VLS, COLL, OLLCP; edge control; multi-slotting; predicting the 2nd pair location in inspection (J Perm) | "Knowing"-stage lookahead; OLL prediction during the last pair; cross solutions chosen for finger tricks and good F2L setups (J Perm sub-12); TPS | CubeSkills; J Perm |
| 6. Sub-10 | <10 | ZBLL subsets, full COLL, etc. (optional) | Efficiency + TPS + recognition; full OLL+PLL is treated as essential ("sub-10 with 2-look OLL is very hard", forum) | Cubelelo sub-10; forum |

**Consistent themes:**
- **F2L is where the time goes.** "Constantly assess your weaknesses, remembering that F2L is the most important part of the solve" (Feliks). J Perm: F2L "is where most of your time investment will be." Forum consensus for sub-20 is that F2L matters more than adding OLLs.
- **Don't over-learn.** J Perm: "Memorizing too much at once will make you forget them." Pace at 2-3 algs a day.
- **Lookahead before TPS.** A common forum recommendation; J Perm calls look-ahead "the most important concept in all of speedsolving."
- **Videos only help if applied.** Feliks: "Watching tutorial videos will only help you to the extent that you put the advice into action."

**Alg counts:** F2L 41 cases (intuitive first), OLL 57, PLL 21, so about 119 for "full CFOP" versus about 16 for 2-look LL. Extreme benchmark: Tao Yu learned 493 ZBLLs in 58 days with a trainer (https://github.com/tao-yu/Alg-Trainer).

## B3. Benchmarks for stats and weakness detection

**Rough split shares** (heuristics; vary by solver):
- Hobbyist at about 26 s: cross 15%, F2L 54%, LL 31% *(anecdotal; speedsolving "Times for each step")*.
- Older data: cross ~10%, F2L ~52%, OLL ~22%, PLL ~17% *(anecdotal)*.
- Sub-10 test grid: F2L ≈ **66% of time, 59% of moves** *(anecdotal)*.
- **Sub-20 target split** (Cubelelo): cross+F2L 12 s, OLL 4 s, PLL 4 s. A commenter's alternative: 2 / 12 / 3 / 3.
- CubeSkills example of two different 20 s solvers: **4-11-2-3** (inefficient F2L, full OLL/PLL) vs **2-9-4-5** (efficient F2L, 4-look LL). The **same average can need opposite fixes**. Its splits tool targets the 60 s to 8 s range; below that, X-cross and OLS distort splits.

**How to use splits** (CubeSkills splits post):
1. Average many solves; splits vary a lot by scramble.
2. Self-analysis matters more than numbers in the long run.
3. Ask which step **can be improved most easily given current knowledge**. Example: sub-20 with full PLL but 5 s PLLs means drill recognition and execution.

**Weakness signals the app should compute:**
- Per-stage mean and SD, compared with level-appropriate reference splits.
- **Cross:** cross time; cross move count vs optimal (via solver); % of solves where the first pair was predicted (pause after cross < X ms; smart cube only).
- **F2L:** per-pair time; **pause time between pairs** (lookahead proxy); rotations and regrips (smart cube gyro); moves per pair vs optimal.
- **LL:** per-case recognition and execution; AUF errors (extra U moves before or after the alg); 2-look fallbacks; skips.
- **Per-case leaderboards:** slowest 5 OLL and PLL by median, highest variance, and the case most often "fumbled" (execution over 2× median).
- **Consistency:** SD of ao12 and % of solves over 1.2× the session mean (bad-solve rate). A tight distribution means push TPS; a wide one means fix lookahead and recognition.
- **Correlates from Boyce & Storm:** pause fraction, regrips, cross moves, algs known, cross-to-F2L pause, LL recognition. All are measurable with a smart cube; partly measurable with taps.

## B4. Drill catalogue (concrete, implementable)

Each drill is listed with what it trains and how the app could support it.

### Cross and inspection
1. **Full-cross planning in inspection:** look for up to 15 s, then do the cross *blindfolded or eyes-closed*. The app shows a scramble, runs a countdown, hides the cube, then checks via smart cube or self-report, and shows the optimal cross for comparison. (J Perm: plan the whole cross; Cubelelo: work toward planning the full cross within 15 s.)
2. **Cross + first-pair prediction:** "practice with unlimited inspection time to force yourself to predict 1 F2L pair" (J Perm). The app offers an unlimited-inspection mode, then asks "which pair?" (tap the slot) before revealing.
3. **Cross efficiency ladder:** scrambles bucketed by optimal cross length (cubetrainer.cc ladder, speedcubedb 1-7, CubeRoot). Target ≤8 moves always and 6-7 typical (the most common optimal is 6 at about 51%, per CubeRoot stats). Show "your moves / optimal".
4. **X-cross recognition:** given a scramble, decide whether X-cross is worthwhile (J Perm: not every solve). The app shows optimal cross+pair vs optimal X-cross move counts.
5. **Alternative solutions:** for the same scramble, find a second good cross (J Perm's exercise). The app accepts multiple inputs and compares them.
6. **Colour neutrality ramp:** dual-colour (white/yellow), then full CN. The app has a pre-rotation setting and per-colour stats (Feliks: start CN early).

### F2L and lookahead (CubeSkills Lookahead Progression Framework)
The stages are **Spotting → Tracking → Knowing** (predict where future pieces will end up).
7. **Slow untimed solves, no pauses:** turn slowly enough that you never stop. "Slow untimed solves are great and help enormously to boost your lookahead and efficiency" (Feliks). The app offers a "no-pause" mode: with a smart cube, flag any gap over N ms; with a metronome, flag missed beats.
8. **Metronome drill:** one turn per beat at a tempo that challenges lookahead without many missed beats. Focus on the **cross→F2L and pair→pair transitions** (CubeSkills). The app needs a built-in metronome with BPM ramp (csTimer has a metronome tool).
9. **Tracking drill:** after the cross, find pair 1 and plan it as hand movements, then find pair 2 *before moving*, execute pair 1 while tracking pair 2, and repeat (CubeSkills).
10. **Slow pair endings:** slow the last 3 moves of each pair so your eyes can leave (CubeSkills).
11. **Blindfolded pairs:** solve single F2L pairs blindfolded, then "two-look F2L": plan and execute 2 pairs blind, twice (CubeSkills). The app shows the case, hides it, and the user executes; verify via smart cube.
12. **Visualisation:** from solved, do `R U R'` (then `R U' R' U R U' R'`), visualising the FR corner and edge before each move with eyes closed (CubeSkills).
13. **OLL prediction during the last pair:** easy version is edge orientation, hard is the full case (CubeSkills). The app pauses after the last-slot insertion and asks "which OLL?" or "how many edges oriented?"
14. **F2L case drills (algorithmic):** all 41 cases from **each of the 4 slots**, including back slots with no rotation (Cubelelo: insert into back slots, use the left hand). Measure recognition and execution separately.
15. **Efficiency review:** compare your pair solutions with a reference sheet (J Perm "Best F2L Algorithms" https://bit.ly/bestf2l), but J Perm warns against learning straight from it without understanding.

### Last layer
16. **PLL time attack:** do all 21 PLLs in sequence for time; csTimer multi-phase can split recognition and execution. Benchmarks *(anecdotal)*: about 60 s for a low-20s solver, about 45 s for sub-15 (https://www.speedsolving.com/threads/pll-time-attack-discussion.8809/). The app records a best and per-case splits within the attack.
17. **2-sided PLL recognition drill:** keyboard answers, 4 AUF × 4 colour shifts, guide card on error (bestsiteever pattern). Target under 0.5-1 s per case; per-case accuracy.
18. **AUF prediction:** for PLL, show two sides and ask for the case **plus** the pre-AUF (solved.no-style trainer; listed in existing tools). For full LL, ask for the post-AUF.
19. **OLL recognition by shape group:** learn "one shape at a time" (J Perm). Drill recognition within confusable groups (e.g. all Ls, all Ps).
20. **Timed alg drilling with triggers:** show the alg split into triggers (jperm "Show triggers"). Drill slowly, then speed up once the finger tricks are set (speedsolving wiki on finger tricks).
21. **Recap pass:** every selected case once, no repeats (bestsiteever OLL "recap"), to verify coverage before random drilling.

### TPS and execution
22. **Alg TPS sprints:** loop one alg 5× for time. Track TPS = moves / time (STM or ETM); compare with personal best. Use for regrip-free finger-trick work.
23. **Consistent-rhythm drill:** metronome at a steady BPM for whole solves. The goal is **evenness** (low variance of inter-move intervals), not raw speed. With a smart cube, plot inter-move gaps; with a metronome, count missed beats. *(The metronome-as-rhythm-tool idea is common in forums and apps such as SpeedCube App; forum posters note diminishing returns after the first weeks.)*
24. **Turn quality:** "quiet hands", keep the cube still, calm turning (CubeSkills). Lock-up and misalign rate from smart-cube data.

### Analysis
25. **Reconstruction practice:** after a notable solve, reconstruct it (write each move) and paste it into a viewer (cubedb.net, Twizzle) to count moves per step and find pauses. The app offers a reconstruction editor with step highlighting and a link-out. With a smart cube, reconstruction is automatic (csTimer Reconstruct tool, Cubeast, cubetrainer.cc).
26. **Walkthrough study:** watch example solves of faster solvers (J Perm, CubeSkills, many forum posts). The app keeps a "study list" of reconstructions to replay.
27. **Solve critique:** compare your F2L to optimal or near-optimal (cubedb.net has automated CFOP critique; CubeSkills Premium has human critiques).

## B5. Session structure (recommended default; our synthesis)

Grounded in: "50% deliberate practice, 50% solves, but be flexible" (speedsolving practice-routines thread), "20-30 minutes of focused practice every day with a predetermined focus" (Cubelelo), practice mirroring competition (Max Park), and CubeSkills' "assess weaknesses".

**A 45-60 min session template:**
1. **Warm-up (5 min):** PLL time attack or SRS "due today" reviews (quick, low stakes).
2. **SRS block (5-10 min):** due algs, plus at most 2-3 new algs, interleaved.
3. **Focused drill (15-20 min):** **one** weakness chosen from stats (e.g. "pause between pairs is 0.9 s, so do metronome + tracking drill"). The app pre-selects it from B3 signals.
4. **Timed solves with intent (15-20 min):** ao12 blocks, competition-style (inspection on, +2/DNF enforced), each block with one cue ("predict the first pair").
5. **Review (5 min):** the app summarises splits vs last week, flags new slow cases into the SRS queue, and suggests the next session's focus.

**Weekly rhythm:** one "comp sim" session (ao5 × 3 with full WCA rules) and one "slow + analysis" session (untimed, reconstruct 3 solves). Rotate the focus drill through cross, F2L and LL by measured weakness.

## B6. Deliberate practice and motor-learning principles to bake in

- **Deliberate practice** (Ericsson, Krampe & Tesch-Römer 1993, "The role of deliberate practice in the acquisition of expert performance", *Psychological Review* 100(3), https://doi.org/10.1037/0033-295X.100.3.363): well-defined goals at the edge of current ability, full concentration, **immediate feedback**, and repetition with refinement. Mapped to the app: one stated goal per block, instant per-attempt feedback (moves vs optimal, recognition time), and difficulty that adapts (ladder).
- **Interleaving / contextual interference:** random (interleaved) practice generally improves *retention* over blocked practice. A 2024 meta-analysis (Czyż et al., *Scientific Reports*, 54 studies, https://doi.org/10.1038/s41598-024-65753-3) found a medium retention benefit overall, but a much smaller one in applied settings and in young participants. Older meta-analyses (Jiménez Díaz et al.) found benefits mainly during acquisition. **Implication:** learn a *new* alg in a short blocked burst (5-10 reps), then move it into interleaved random review. That is essentially what jperm and bestsiteever trainers do, plus SRS.
- **Spacing:** short daily sessions beat cramming. J Perm caps PLL learning at 2/day "and not every day" to limit forgetting. After a break, algs often return within a few solves, and watching the piece movement helps relearning *(anecdotal, speedsolving)*.
- **Retention techniques for alg muscle memory:**
  1. Learn algs as **triggers** (sexy, sledge, etc.) and as **mirrors or inverses** of known algs. J Perm notes many OLLs "can just be mirrored from other cases."
  2. Attach a **recognition cue** (written note) to each case; resurface it on error (bestsiteever notes).
  3. **Overlearn slightly, then space** (do it many times right after learning, then review the next day).
  4. Keep **one canonical alg per case** in the app (with alternates hidden) to avoid interference.
  5. **Real-solve exposure counts:** OLL/PLL appear in every solve, but rare cases (PLL: H, Na and Nb are 1/72 each, E and Z 1/36, most others 1/18; the rarest OLLs are 1/108 to 1/216) need scheduled review. The jperm "Realistic" probability mode is fine for fluency but bad for coverage, so the SRS scheduler should own coverage.
- **Practice like competition** (Max Park observation; WCA rules): regular sessions with real inspection, penalties and logging.

## B7. What the app should measure for each methodology (implementation checklist)
- **Per solve:** scramble, raw time, penalty, splits (cross, F2L, OLL, PLL; per pair when available), detected cases, cross moves vs optimal, inspection used, notes.
- **Per case:** attempts, recognition time distribution, execution time distribution, error count, SRS card (FSRS state), chosen alg, notes, last-seen-in-solve.
- **Per drill:** drill type, parameters (BPM, ladder length), score, date.
- **Derived:** reference-split comparison, bad-solve rate, pause fraction (smart cube), TPS, PLL attack PB, cross optimality %, first-pair-prediction rate.
