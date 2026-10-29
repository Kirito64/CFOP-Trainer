# Existing CFOP trainers, timers and alg sites: survey

Researched 2026-10-28. Repo stats (stars, last push) come from the GitHub API on that date. Some sites are JS-only single-page apps, and some forums (speedsolving.com, reddit) blocked automated fetching. Where a claim comes from a search snippet or third-party description rather than the tool itself, it is marked *(unverified)*.

---

## 0. TL;DR: what this means for our app

**Already well covered by free tools (don't compete on these alone):**
- Picking OLL/PLL cases and getting a timed drill with scrambles: csTimer, jperm.net, bestsiteever, speedcubedb, Alg-Trainer, Cubedex, CubeDesk.
- 2-sided PLL recognition flash drills: bestsiteever, CubeSkills, speedcubedb, cube.academy, many GitHub clones.
- Cross/X-cross trainers with optimal solutions: CubeRoot, speedcubedb, csTimer's solver tool, cubetrainer.cc.
- Smart-cube timing with CFOP stage splits: Cubeast (paid), cubetrainer.cc, csTimer, CubeDesk, GAN CubeStation.

**Gaps and weak spots seen across the ecosystem (opportunities):**
1. **No real spaced repetition for algs.** Trainers use "balanced/realistic" random draws, "slowest cases", or ad-hoc weighting (bestsiteever PLL recog: worst 15% → 4×). Nobody schedules reviews over days with SM-2/FSRS. Only a 0-star toy repo (CubeCoach) does SM-2 flashcards, and that is not a trainer. Anki decks exist only as forum one-offs.
2. **Recognition and execution are rarely separated without a smart cube.** csTimer's multi-phase timing can do it manually (two spacebar presses). Cubeast and cubetrainer.cc do it with a smart cube. No dumb-cube trainer makes "recognition time" a first-class metric across OLL, PLL and F2L.
3. **F2L is under-served.** One dedicated open-source F2L trainer exists (f2l-trainer.top). Most trainers treat F2L as 41 algs. Almost none drill *lookahead* (tracking the next pair) or *multi-slot* cases with other slots filled or empty.
4. **No tool links whole-solve stats to targeted drills** for a dumb-cube user. "Your PLL split is weak, here are your 5 slowest PLLs, drill them" exists only in smart-cube tools (cubetrainer.cc, Cubeast). For manual users, csTimer has splits and jperm has per-case times, but they don't talk to each other.
5. **Structured progression and practice plans are missing.** CubeSkills explicitly has none. Advice lives in blog posts and videos. No app offers a "sub-30 → sub-20 curriculum" with milestones, drill rotation and session structure.
6. **AUF and pre-AUF are rarely trained.** Recognizing from any angle and predicting AUF are separate skills. Only a few recognition trainers randomize AUF and colour shift (bestsiteever does: 4 AUF × 4 colour shifts).
7. **Data portability and longevity are weak.** algdb.net is "under construction" (dead), speedcubedb has had suspensions and has no export or API, and CubeSkills isn't releasing new content. Open, exportable data is a real differentiator.
8. **iOS and Safari users can't use Web Bluetooth.** Every web smart-cube trainer is Chromium-only (Bluefy browser is the workaround).

---

## 1. Feature matrix (quick view)

| Tool | Type | OLL/PLL drill | F2L drill | Cross/X-cross | Recognition drill | Case scrambles | Per-case stats | SRS | Smart cube | Open source / license |
|---|---|---|---|---|---|---|---|---|---|---|
| csTimer | Web timer | Yes (scramble subsets + weights) | Yes (LS/VLS/ZBLS, "cross solved") | Solver tool + easy-cross scrambles | Manual (multi-phase) | Real random-state via min2phase | Training Stat. tool | No | GAN, MoYu, QiYi, GoCube, Giiker | Yes, GPL-3.0 |
| jperm.net trainers | Web | Yes | No | No | No | Yes | Yes (per case, slowest) | No (status: unlearned/learning/finished) | No | No |
| bestsiteever.net | Web | OLL, PLL, ZBLL | No | No | PLL recog (adaptive) | Precomputed per case | Yes | Adaptive weighting only | No | Code public, **no license file** |
| speedcubedb.com | Alg DB + trainers | Yes | Yes (sets) | Cross trainer 1-7 moves | 2-sided PLL | Yes | "Statistics" | No | No | No |
| cubedb.net | Recon / sim tool | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | No |
| CubeSkills | Tutorials (paid) | PDFs/videos | Videos | Videos | PLL recog (stats are Premium) | n/a | Premium | No | No | No |
| Alg-Trainer (tao-yu) | Web | Many sets | F2L, ZBLS, etc. | No | No | Real scrambles via cubejs (Kociemba) | Timer | No | Giiker | Yes, MIT |
| CubeDesk | Web timer + trainer | 750+ trainers, custom | Via custom | No | No | Yes | Yes | No | GAN, MoYu, QiYi, Giiker | Yes, GPL-3.0-or-later |
| Cubeast | Smart-cube app | Academy exercises | X-cross exercise | X-cross | Yes (recognition exercises) | Yes | Recog vs exec per phase | No | "All 3x3 smart cubes" | No (~$5/mo premium, unverified) |
| GAN CubeStation | Smart-cube app | Alg training | ? | ? | ? | Yes | Yes | No | GAN only | No |
| cubetrainer.cc (wodzik/cube) | Web, smart-cube-first | Yes | Slots | Cross/XCross/XXCross with optimal lengths, "ladder" | Recognize mode (time to first turn) | Known-optimal-length | Yes (per case, per alg) | No | GAN, MoYu, QiYi, GoCube, Giiker | Yes, GPL-3.0 |
| Cubedex | Web PWA | OLL/PLL + sets | ? | No | No | Yes | Yes | No | Yes (multi-vendor) | Yes, MIT |
| F2L Trainer (f2l-trainer.top) | Web | No | **Yes, dedicated** | No | No | Yes | Charts | No | Yes | MIT (badge; no GitHub license metadata) |
| CubeRoot (cuberoot.me) | Web solvers + trainers | LL solvers | Free-pair trainers | 8 cross-family trainers | No | min2phase + pruning | HTM distribution | No | No | Yes, GPL-3.0 |
| Twisty Timer | Android timer | Alg reference lists *(unverified)* | No | No | No | TNoodle | Yes | No | No | Yes, GPL-3.0 (stale since 2023) |
| Twizzle / cubing.js | Library + editor | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Experimental | MPL-2.0 OR GPL-3.0+ |

---

## 2. Timers with training features

### csTimer
- **URL:** https://cstimer.net. Source: https://github.com/cs0x7f/cstimer (GPL-3.0, ~788 stars, pushed 2026-10-26, very active). npm: `cstimer_module` (GPL-3.0) exposes scramble generation.
- **Training scramble modes** (from the English language file `src/lang/en-us.js`, "3x3x3 CFOP" menu): `PLL`, `OLL`, `last slot + last layer` (lsll2), `last layer`, `ZBLL`, `ZBLLx2`, `COLL`, `CLL`, `ELL`, `2GLL`, `ZZLL`, `ZBLS`, `EOLS`, `WVLS`, `VLS`, `cross solved` (= F2L practice from a solved cross), `EOLine`, `EO Cross`, `easy cross` (configurable length), `easy xcross`. Also Roux (2nd block, CMLL, LSE), Mehta and 2x2 subsets, plus "3x3 edges only / corners only".
- **Case filtering and weighting:** each subset can be filtered to specific cases, and there is a setting called "Probabilities for training-scramble states" (`PROPERTY_SCREQPR`) to weight cases.
- **How case scrambles are generated** (from `src/js/scramble/scramble_333_edit.js`): `getAnyScramble(ep, eo, cp, co, neut, rndapp, rndpre)` builds a cubie-level state from bitmasks, using wildcards for the pieces that should be random. It applies random AUF pre and post moves (`aufsuff`), optionally applies colour neutrality, then solves with **min2phase** (Shuang Chen's two-phase solver) and rejects solutions of 3 moves or fewer. Scrambles are therefore "real" random-state scrambles that can't be read as an inverse alg. PLL and OLL each use a case table (`pll_map`, `oll_map`).
- **Tools panel:** Cross / EOLine / Roux S1 / 2x2x2-face solvers (shows optimal cross for the current scramble), scramble image, stats, cross-session stats, time distribution, time trend, **metronome**, **Reconstruct** (for Bluetooth solves: per-step inspection/exec/turns/TPS), **Training Stat.**, daily statistics, common-scramble seed, online battle.
- **Multi-phase timing:** splits a solve into N phases with extra key presses (e.g. cross/F2L/OLL/PLL, or recog/exec for PLL time attacks).
- **Input modes:** timer, typing, Stackmat, MoYu timer, virtual cube, Bluetooth cube, qCube, Bluetooth timer, and **Last Layer Training** entry mode.
- **Smart cubes** (`src/js/hardware/`): `gancube.js`, `moyucube.js`, `moyu32cube.js` (WRM/MoYu32 protocol), `qiyicube.js`, `giikercube.js`, `gocube.js`, plus GAN and QiYi Bluetooth timers and Stackmat.
- **Stats:** configurable averages. Default trimming is `p5`, i.e. `ceil(n × 5%)` trimmed from each side (`src/js/stats/timestat.js`): ao5 and ao12 trim 1, ao50 trims 3, ao100 trims 5. Shows best/worst possible average (BPA/WPA), target times, session manager (split/merge), CSV export, and backup to file, csTimer server or Google.
- **Good:** the most complete free scramble-subset engine; real random-state case scrambles; offline PWA; broad hardware support.
- **Missing:** dense, dated UI; case selection is a modal grid with no learning status; no notion of which algs you know, no spaced repetition; Training Stat. is shallow; no alg display or teaching; no guided curriculum.

### CubeDesk
- **URL:** https://cubedesk.io. Source: https://github.com/kash/cubedesk (GPL-3.0-or-later, ~222 stars, pushed 2026-10-25, active).
- **Features:** timer with pb/ao5/ao12 stats; "750+ trainers, custom trainers and a marketplace of free algorithms"; custom trainers for 2x2/3x3 with a 3D cube designer; 1v1 races; friends; Pro tier (focus mode, Stackmat support).
- **Smart cubes:** the repo has `client/components/timer/smart-cube/bluetooth/{gan,qiyi,moyu,moyu_mhc,giiker}.ts`.
- **Stack:** React client plus Node/tRPC/Prisma/Postgres/Redis server, deployed to AWS ECS. Heavier than needed for a client-only trainer.
- **UX ideas:** an alg marketplace (community-shared sets) and custom trainers with your own cube-state images.
- **Missing:** no SRS; the trainer is a list-and-time tool.

### Twisty Timer (Android)
- **URL:** https://github.com/aricneto/TwistyTimer (GPL-3.0, ~280 stars, last push 2023-07, effectively unmaintained). Active fork: https://github.com/hato-ya/CubicTimer (adds external Stackmat support, pushed 2026-08).
- **Features:** material-design timer, TNoodle scrambles for all WCA puzzles, Crowdin translations. Also, *(unverified, from memory of the app)*, OLL/PLL reference lists with per-case progress and stats charts.
- **Takeaway:** the native-app quality bar for a timer; shows that GPL scramble libraries can be bundled into an app.

### TPS Cube
- **URL:** https://tpscube.xyz. Source: https://github.com/D0ntPanic/tpscube (MIT, Rust/egui, stale since 2022).
- **Notable:** Bluetooth split timing; "solve history that isn't lost when quick-resetting sessions"; anonymous cloud sync. It wrote its **own MIT scramblers** because GPL scramblers conflict with the iOS App Store. That matters if we ever ship native.

---

## 3. Algorithm trainers (web)

### jperm.net trainers
- **URLs:** https://www.jperm.net/algs/oll, https://www.jperm.net/algs/pll, plus COLL, WV, 2-look, OH OLL/PLL, 2x2 and 4x4 sets. Closed source.
- **Features** (from the PLL page UI):
  - "Algorithms to Train": `All`, `Groups`, `Status`, `Slowest`.
  - **Learning status** per case: `Unlearned` / `Learning` / `Finished`. Settings can move learning cases up and finished cases down.
  - **Trash:** exclude cases; shift-click selects several.
  - **Probability:** `Balanced` (each case equally often) vs `Realistic` (real-solve frequencies).
  - "Show triggers (brackets)" splits algs into triggers.
  - Hint toggle (Left/Right keys).
  - Timer on space; keyboard shortcuts for delete, reset and previous/next scramble.
  - Stats and Times views; "Use slowest cases" restricts the drill to your slowest cases by average.
- **Good UX:** learning-status triage, trigger brackets, balanced vs realistic distributions, one-click "drill my slowest".
- **Missing:** no recognition-only mode; no spaced repetition; "slowest" needs a page reload to update; no F2L or cross.

### bestsiteever.net (Roman Strakhov, "Roman-")
- **OLL trainer:** https://bestsiteever.net/oll/, source https://github.com/Roman-/oll_trainer (~57 stars, **no license file**). Timer-like: select cases, then random mode or **recap mode** (go through every selected case once, without repeats). Design rationale is in the speedsolving thread https://www.speedsolving.com/forum/threads/oll-trainer.66924/ (403 to bots). There is a PLL trainer at `/pll/`.
- **ZBLL trainer:** https://bestsiteever.net/zbll, source https://github.com/Roman-/zbll (Vue rewrite, no license). Scrambles come from a **precomputed JSON map** (`zbll_map_next.json`) of solver-generated scrambles per case, bucketed by length. A random y-rotation is applied by relabelling faces, choosing the variant with fewer B moves (see `src/helpers/scramble_utils.js`).
- **PLL recognition trainer:** https://bestsiteever.net/pll_recognition, source https://github.com/Roman-/pll_recognition_trainer (pushed 2026-04, no license). Best-in-class recognition UX:
  - 73 distinct two-sided patterns across the 21 PLLs; each case shown in up to **16 variations (4 AUF × 4 colour shifts)**.
  - **Keyboard-driven answers** (press `A`, `G`, ...; optional full-name mode such as `Gb`); on-screen keys on mobile.
  - On a wrong answer it shows the matching card from **Mark Rivers' Two-Sided PLL Recognition Guide** (https://www.speedsolving.com/threads/two-sided-pll-recognition-guide.53180/) with the row highlighted. It does this with a precomputed `(case, rotation)` → guide-row lookup built from a mini cube simulator.
  - **Personal notes** per case that resurface when you get that case wrong.
  - **Adaptive queue:** worst 15% → 4 repetitions, next 15% → 3, next 20% → 2, rest → 1.
  - Customisable camera angle (Right/Left/Center/CubeSkills), colour scheme editor, cross-colour filter.
  - Evaluation screen with accuracy and per-case average recognition time. Client-only, localStorage.
- **Missing:** no licenses (can't reuse code); separate siloed apps; no cross-day scheduling.

### Alg-Trainer (tao-yu)
- **URL:** https://tao-yu.github.io/Alg-Trainer/. Source: https://github.com/tao-yu/Alg-Trainer (**MIT**, ~49 stars, last push 2024-06).
- The author learned **full ZBLL (493 algs) in 58 days** with it.
- **Sets:** PLL, OLL, F2L, COLL, WV, ZBLL, 2GLL, ZZLL, ZBLS, CLS, TTLL, CMLL, TOLS, CLL, CPEOLL, OLLCP and more, trainable by subset (e.g. ZBLL T/U/L/Pi/H/S/AS separately). Supports a **user-defined algset** (paste algs).
- **Real scrambles:** each case state is solved with `ldez/cubejs` (MIT, Kociemba two-phase), so scrambles are not just the inverse alg.
- **Virtual cube** with a Ryan Heise ergonomic keyboard layout. **Giiker** smart-cube support (via `hakatashi/giiker`, MIT).
- **Pre-orientation controls:** a fixed rotation (e.g. `z2` for yellow-top) plus random `y` / `x2` rotations to simulate colour neutrality.
- **Takeaway:** an MIT reference implementation for "case state → real scramble" and paste-your-own sets.

### speedcubedb.com (Gil Zussman)
- **URL:** https://www.speedcubedb.com. Closed source.
- **Alg DB:** 3x3 (PLL, OLL, F2L, ZBLL, WV/VLS/COLL/CMLL/SBLS/ELL/Anti-PLL, OLLCP...), plus 2x2, 4x4, 5x5, SQ1, Megaminx, Pyraminx and Skewb. Community-voted algs; Google sign-in tracks "algorithms learnt" and personal alg sheets. WCA login no longer supported.
- **Trainers:** Practice (`/t`: select algs, space timer, statistics), **2 Sided PLL Recognition** (`/t/pllrecog`), **Cross Trainer** (`/cross`: choose colour and **difficulty 1-7 move cross**, 3D visualiser, show/hide suggested solutions), Scramble Analyzer (`/analyze`), SQ1 CSP tracing.
- **Reliability:** speedsolving threads report outages and suspension ("speedcubedb is down forever", https://www.speedsolving.com/threads/speedcubedb-is-down-forever.92283/, and https://www.speedsolving.com/threads/speedcubedb-down.93541/). It is online as of this research. **No export or API.** GitHub has scrapers (e.g. `QuantumQream/SpeedCubeDB-WebScraper`), but the licensing of the scraped data is unclear.

### algdb.net
- **URL:** http://algdb.net. Currently a TheCubicle **"Under Construction"** placeholder. Acquired by TheCubicle from Stachu in Dec 2017 (https://www.speedsolving.com/wiki/index.php/AlgDatabase). A planned rewrite, https://github.com/cubing/algdb (GPL-3.0, GraphQL), has had no activity since 2021-03.
- **Takeaway:** the canonical community alg DB died. This is a cautionary tale for relying on third-party alg sources; ship our own dataset.

### Cubedex
- **URL:** https://cubedex.app. Source: https://github.com/poliva/cubedex (**MIT**, pushed 2026-10-27, active).
- Alg trainer for OLL, PLL and other sets; works with smart cubes **and** regular cubes; offline PWA. Built on `smartcube-web-bluetooth` and `cubing.js`. Tutorial: https://www.youtube.com/watch?v=AZcFMiT2Vm0.
- **Takeaway:** closest open-source analogue to what we would build; MIT, so patterns can be borrowed.

### F2L Trainer (Dave2ooo)
- **URL:** https://f2l-trainer.top. Source: https://github.com/Dave2ooo/F2LTrainer (README badge says MIT; GitHub reports no license file; Svelte 5 + Tailwind; pushed 2026-10).
- Dedicated F2L case selection, "Classic Training" and "Drill" modes, cubing.js 3D, smart-cube support via smartcube-web-bluetooth, statistics charts. Inspired by the jperm and bestsiteever OLL trainers.
- **Missing:** doesn't train multi-slot awareness or lookahead.

### LL-Trainer
- **URL:** https://ll-trainer.web.app (Pirolley Melvyn). Exercises grouped by method (CFOP, Roux), per-case stats, custom methods and algorithms, three themes, mobile layout. Closed source.

### cube.academy
- **URL:** https://cube.academy/cubing-tools. Links csTimer and the bestsiteever OLL/PLL/PLL-recognition trainers. Its own PLL recognition trainer is built on the two-sided idea.

### Other GitHub "alg trainer" projects (small, for reference)
- https://github.com/mihlefeld/Alg-Trainers (GPL-3.0, active 2026-10).
- https://github.com/mmgoodnow/alg-trainer (Vue LL drill).
- https://github.com/Darguima/FridrichTrainer (MIT, React Native, F2L/OLL/PLL).
- https://github.com/smonteillet/pll-trainer (Groovy PLL scramble generator).
- https://github.com/kameron-ctrl/CubeCoach: Next.js + FastAPI, SM-2 flashcards for 57 OLL + 21 PLL, Claude-powered coaching. The only SRS-for-algs project found, with 0 stars.
- PLL recognition clones: https://github.com/TWal/2sidePllTrainer, https://github.com/KianOladive/pll-recognition (with guide), https://github.com/Antareszk/2-Sided-OLL-and-PLL-Recognition (also does OLL two-sided).
- SpeedSolving thread on another web alg trainer with F2L, custom groups and timer: https://www.speedsolving.com/threads/algs-trainer.86254/.
- No site or project named "SpeedCubeTrainer" was found. The name appears to be generic.

### Mobile alg-trainer apps (closed, for UX reference)
- PLL Trainer (iPad, two-sided recognition, colour-neutral option): https://apps.apple.com/lb/app/pll-trainer/id1595459897
- CubeNook: https://apps.apple.com/app/id1544644116
- Cube Coach (practice picker weighted toward missed and slow cases)
- SpeedCube App (built-in metronome for rhythm)
- KewbzTrainer, Permy (https://lgames.sourceforge.io/permy/about.html)

---

## 4. Cross / F2L / step trainers

### CubeRoot (cuberoot.me)
- **URL:** https://cuberoot.me. Docs: https://cuberoot.me/tools/documentation/. Source: https://github.com/2017YANR02/cuberoot.me (**GPL-3.0**, pushed 2026-10-27).
- **8 trainers:** Cross, XCross, XXCross, Free Pair, XCross Free Pair, Pseudo XCross, Pseudo Free Pair, EOCross. Random patterns come from **min2phase.js** plus full pruning tables; your solution is checked instantly against the optimum.
- **Solvers:** F2L, pairing, pseudo-F2L, EOCross, LL substeps, LL+AUF ("full" solvers need about 800 MB of tables; "lite" variants for mobile), two-phase, 2x2 CLL/EG. Visual state editor. **Batch Solver** (ported from trangium/BatchSolver, MIT) ranks algs by **MCC** (simulated execution speed), STM and SQTM: https://cuberoot.me/scramble/batch-solver.
- **Useful stats (optimal HTM distributions):** most common optimal cross is 6 moves (~51%), X-cross 8 (~56%), free pair 7 (~56%), EOCross 8 (~53%).
- PWA, offline.

### cubetrainer.cc (wodzik/cube)
- **URL:** https://cubetrainer.cc. Source: https://github.com/wodzik/cube (**GPL-3.0**, pushed 2026-10). Smart-cube-first, client-only, IndexedDB.
- **Solve page:** random-state scrambles with **live scramble tracking and wrong-move repair**; auto start and stop; **CFOP/Roux/LBL stage detection**; per-stage recognition vs execution breakdown with 3D replay; shows **which case** each stage started from (F2L pair, OLL, PLL) one click from its algs; compares your cross with the optimal one, one click from practising that exact cross.
- **Step trainers with known-optimal-length scrambles:** Cross (1-8), XCross (2-10), XXCross (3-10), Pair (1-9), F2L slots, OLL/PLL by group with random AUF, Roux, ZZ. Two modes: *Scramble* (the case scrambled on your cube) and *Recognize* (case on screen, measures **time to first turn**). Shows **your moves / optimal** with a hint. **"Ladder" mode:** if at least 80% of your last 10 at this length were optimal, the next ones get one move longer.
- **Next scramble is generated from wherever your cube is**, so no re-solving between attempts.
- **Stats per case:** frequency in your real solves, solve speed, drill times, recognition times. Each alg shows "fastest" and "most consistent".
- **Time Attack** (every case in one run), Versus mode, OP blindfolded.
- **Takeaway:** the most thoughtful open-source design found. The ladder and real-solve-to-drill linking are strong ideas. It requires a smart cube and Chromium for the full experience.

### speedcubedb Cross Trainer
- See above: 1-7 move difficulty, 6 colours, suggested solutions.

### csTimer
- "easy cross" and "easy xcross" scrambles plus the Cross/X-cross solver tool. See above.

---

## 5. Reference, reconstruction and visualisation sites

### cubedb.net (Gil Zussman)
- **URL:** https://cubedb.net. Relaunched with more puzzles (https://www.speedsolving.com/threads/cubedb-net-is-back-with-clock-skewb-pyra-and-much-more.92383/).
- Reconstruction and alg viewer with playback; highlights (Full Cross, F2L, OLL, LL, PLL, COLL, F2B, CMLL...); colour settings; move counts in **HTM, QTM, STM, ETM**; rotate, mirror (M/S), invert; **automated CFOP "solve critique"**; random scramble.
- **Takeaway:** shareable reconstruction URLs plus step highlighting is a pattern to copy for solve review.

### CubeSkills (Feliks Zemdegs)
- **URL:** https://www.cubeskills.com. Free tutorials, plus Premium (monthly; ₹400/mo shown for an India locale) for all videos, comments, livestream archive and a 90+ solve-critique database.
- **Tools:** PLL Recognition Trainer (https://www.cubeskills.com/tools/pll-recognition-trainer); two-sided; untimed tests are free; **timed results history and analytics are Premium**. Solve Critiques, Glossary. Blog posts: "How To Get Faster?", "Lookahead Progression Framework", CFOP solve splits tool.
- **Status:** the site says it is currently **"unable to release new videos and content."** The membership page mentions **no structured training programs or practice plans**.
- **Takeaway:** high-trust methodology content (see the practice doc), with no interactive training beyond PLL recognition.

### Twizzle / cubing.js
- **URLs:** https://alpha.twizzle.net (Edit: https://alpha.twizzle.net/edit/; Explore: https://alpha.twizzle.net/explore/). Library: https://js.cubing.net/cubing/. Source: https://github.com/cubing/cubing.js (**MPL-2.0 OR GPL-3.0-or-later**, v0.66.1, active). Successor to the frozen alg.cubing.net.
- Twizzle Edit is the de facto way to share an alg or reconstruction link. See the build-resources doc for the API.

### cubing.net
- https://cubing.net, a portal for community apps. Its GitHub repo is archived and moved to https://codeberg.org/cubing/cubing.net. Hosts **VisualCube** at https://visualcube.api.cubing.net.

---

## 6. Smart-cube apps and Bluetooth ecosystem

### Cubeast
- **URL:** https://www.cubeast.com, web app at https://app.cubeast.com. Closed.
- "All existing 3x3 Bluetooth cube models are supported." Solve analysis splits **recognition vs execution per phase**, plus inspection, pickup and put-down times; supports major methods and new ones can be added. **Academy** exercises for learning algs, alg recognition and **improving X-cross**. Works with Stackmat.
- Pricing: a Reddit comment (May 2026) says about **$5/month** for premium *(unverified)*.

### GAN CubeStation
- App Store: https://apps.apple.com/app/id6473158674. Official GAN app. Training and battle platform: guided lessons, algorithm training, daily challenges, online battles, rankings, move tracking and solve analysis (from retailer listings). App Store reviews complain the v5 update regressed training and lost data *(single user, unverified)*. GAN cubes only.

### Other closed smart-cube apps
- Cubing Forge (Steam; CFOP phase timing): https://store.steampowered.com/app/4959210
- CubeHub: https://www.speedsolving.com/threads/new-mobile-app-cubehub-with-smart-cube-support-timer-algorithm-database-and-practice-modes.95172/
- Hongyi CFOP Cube Solver (subscription "AI coaching")
- Deddal

### Protocols and open libraries (details in the build-resources doc)
| Library | License | Brands |
|---|---|---|
| `smartcube-web-bluetooth` (https://github.com/poliva/smartcube-web-bluetooth) | MIT | GAN Gen1-4, Giiker/Mi, GoCube/Rubik's Connected, MoYu (AI 2023, MHC, WRM `WCU_MY3`, Weipo V5 2x2), QiYi, XMD Tornado V4; GAN timers |
| `gan-web-bluetooth` (https://github.com/afedotov/gan-web-bluetooth) | MIT, v3.0.2 (2024-08) | GAN Gen2/3/4, MoYu AI 2023 (uses GAN Gen2) |
| `cubing/bluetooth` (cubing.js) | MPL/GPL | GiiKER, GoCube, GAN (some versions incompatible), HEYKUBE, QiYi; **MoYu: no** |
| csTimer `src/js/hardware/*` | GPL-3.0 | GAN, MoYu (+MoYu32), QiYi, GoCube, Giiker, GAN/QiYi timers |
| QiYi protocol write-up (https://codeberg.org/Flying-Toast/qiyi_smartcube_protocol) | n/a | QiYi; includes a Wireshark dissector |
| `hakatashi/giiker` | MIT | Giiker (2018, stale) |

---

## 7. Recognition trainers (summary)
- **PLL two-sided:** bestsiteever (best UX, adaptive, guide integration), CubeSkills (stats paywalled), speedcubedb, cube.academy, PLL Trainer iPad app, many GitHub clones.
- **OLL recognition:** rare. One GitHub project does two-sided OLL + PLL (Antareszk). Cubeast and cubetrainer.cc measure recognition time on a real cube.
- **F2L recognition:** effectively none apart from cubetrainer.cc's Recognize mode (time to first turn).
- **Reference guide:** Mark Rivers' Two-Sided PLL Recognition Guide (https://www.speedsolving.com/threads/two-sided-pll-recognition-guide.53180/), and the older guide at https://www.speedsolving.com/forum/threads/two-sided-pll-recognition-guide.41108/.

## 8. Anki decks
- No maintained AnkiWeb deck for OLL/PLL turned up in search; the AnkiWeb shared-deck search page is JS-rendered and didn't load. A speedsolving user built two PLL Anki decks: a recognition decision tree, and all **288 PLL states** (https://www.speedsolving.com/goto/post?id=217461). Physical flashcards are sold, e.g. SpeedCubeShop CFOP Algorithm Flashcards (https://speedcubeshop.com/products/cfop-algorithm-flashcards).
- **Takeaway:** Anki's model (flashcard plus self-rated recall) fits alg memory well, but no cubing tool fuses SRS scheduling with *timed execution on a real cube*. That fusion is our clearest differentiator.

---

## 9. UX ideas worth stealing
1. **Learning-status triage** (Unlearned/Learning/Finished) plus **Trash** (jperm).
2. **Balanced vs Realistic** case probability (jperm). csTimer's per-case probability weights.
3. **Recap mode**: every selected case exactly once (bestsiteever OLL).
4. **Keyboard-letter answers** for recognition, **16 variations per case** (AUF × colour), **guide card on error**, **personal notes resurfacing on error** (bestsiteever PLL recog).
5. **Trigger brackets** in alg display (jperm).
6. **Ladder difficulty** for cross/X-cross: lengthen when ≥80% of the last 10 were optimal (cubetrainer.cc).
7. **"Your moves / optimal"** feedback and optimal solution reveal (cubetrainer.cc, CubeRoot, speedcubedb).
8. **Link from a real solve's case to drilling that case** (cubetrainer.cc).
9. **Time to first turn** as the recognition metric (cubetrainer.cc Recognize mode).
10. **Multi-phase manual splits** for dumb-cube users (csTimer).
11. **Best/worst possible average** (csTimer BPA/WPA) to motivate within an ao5.
12. **Pre-orientation settings** for colour neutrality (Alg-Trainer).
13. **Paste-your-own algset** (Alg-Trainer), plus an alg marketplace (CubeDesk).
14. **MCC-ranked alg alternatives** (trangium/CubeRoot Batch Solver) to help users choose algs.
15. **Offline PWA, no account, export/import** (csTimer, Cubedex, cubetrainer.cc).
