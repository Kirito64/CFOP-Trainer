# CFOP Trainer

A personal training app for CFOP speedsolving, from about 13 seconds to sub-10.

- **Train algs:** scramble your cube into a case and solve it with a stackmat-style timer. Spaced repetition (FSRS) schedules the next review from your time, with no self-rating needed. Covers F2L (front-right and mirrored front-left), OLL, PLL, COLL and Winter Variation.
- **Recognise:** on-screen recognition drills. Covers PLL from two sides or the top, AUF prediction, and OLL against look-alike cases.
- **Timer:** WCA inspection with automatic +2/DNF, random-state scrambles, ao5/ao12/ao50/ao100, optional split taps per stage, and optional logging of which OLL/PLL came up.
- **Drills:**
  - cross trainer with an optimal-cross ladder
  - metronome solves
  - PLL time attack
  - alg TPS sprints
- **Today:** a daily session plan that picks its focus from your splits, plus a sub-10 roadmap.
- **Library:** every case with verified algs, an animated player, your chosen or custom alg (checked by simulation), and notes.

Data lives in IndexedDB, so everything works offline. Sign in with a passkey to sync between devices through a Cloudflare Worker and a per-user Durable Object.

## Commands

Everything runs through bun.

| Command | What it does |
|---|---|
| `bun install` | Install dependencies |
| `bun run dev` | App and Worker together at http://localhost:5173 (use `localhost`, not `127.0.0.1`, for passkeys) |
| `bun test` | Cube model, every shipped alg, stats rules, cross solver, sync merge logic |
| `bun run typecheck` | TypeScript across app, Worker and tests |
| `bun run build` | Production build into `dist/` |
| `bun run deploy` | Build, then deploy to Cloudflare (run `bunx wrangler login` once first) |
| `bun scripts/build-data.ts` | Regenerate `src/data/algsets.json` from `research/*.json` |
| `python3 -I research/verify_algs.py research` | Independent Python check of the research alg files |

`bun run dev` starts Vite through `bunx` without `--bun`. Cloudflare's local Workers runtime (Miniflare) can't route requests under Bun's own runtime, so Vite runs on Node under the hood (see oven-sh/bun#39247).

## Layout

```
research/            Research notes and the verified source alg data (JSON), plus the Python verifier
scripts/             build-data.ts: research JSON -> src/data/algsets.json
src/cube/            Sticker-level cube model, case checks, case scrambles (cubing.js solver), optimal cross
src/data/            Shipped alg sets and lookups
src/db/              Dexie (IndexedDB) schema and data helpers
src/srs/             FSRS scheduling and automatic grading
src/sync/            Passkey API client and the sync loop
src/features/        Pages: today, trainer, recognition, timer, drills, library, stats, settings
worker/              Cloudflare Worker: passkey auth (AuthStore DO) and sync (UserStore DO)
```

## Conventions

- Algs are written for yellow on top and green in front, with white cross on the bottom. F2L algs insert into the front-right slot.
- Trainer scrambles assume that same orientation. Timer and cross-trainer scrambles use the WCA orientation (white on top, green in front).
- Passkeys are tied to a hostname. A passkey made on `*.workers.dev` won't work on a custom domain later, so pick the final domain before relying on sync.
