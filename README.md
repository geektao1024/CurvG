# CurvG

CurvG is a math tool site with two halves that feed each other:

- **Free interactive labs** (`/labs`): one idea per board you can drag —
  sliders, a guided walk-through, the explanation and a short quiz. They are
  the indexable, shareable entry point.
- **A formula-first AI animation generator** (`/creator`): any lab, curve or
  idea becomes a narrated Manim video, with the scene plan and code kept
  inspectable instead of hidden behind an opaque text-to-video call.

The curve encyclopedia (`/curves`), scene library (`/library`) and guides
(`/blog`) sit around them for search and discovery.

Website: [curvg.com](https://curvg.com) · Project brief and change log:
[docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md)

## Site map

| Path                                                                        | What it is                                                                                                                  | Doc                             |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `/`                                                                         | Homepage, labs first: a live lab + topic search, the lab index, lab → video, for teachers, what's new, pricing summary, FAQ | `SITE_ARCHITECTURE_PLAN.md`     |
| `/labs`, `/labs/{math,physics}`, `/labs/{suite}`, `/labs/{suite}/{chapter}` | Interactive labs: hub with topic search → subject page → suite → chapter (full-screen workspace)                            | `LABS_PLAN.md`                  |
| `/creator`                                                                  | AI animation generator (sign-in to render)                                                                                  | `CURVG_CREATOR_ARCHITECTURE.md` |
| `/curves`, `/curves/{slug}`                                                 | 30-curve encyclopedia with live parameter previews                                                                          | `CURVE_ENCYCLOPEDIA.md`         |
| `/library`, `/library/{hub}`, `/library/{hub}/{topic}`                      | Editorial library: math content graph; links curves and labs                                                                | `LIBRARY_PLAN.md`               |
| `/pricing`                                                                  | Plans and credits                                                                                                           | —                               |
| `/blog`, `/blog/{slug}`                                                     | Guides (MDX in `src/content/posts`)                                                                                         | —                               |
| `/math-animation-tool`, `/free-math-video-creator`, `/manim-alternative`    | One-keyword landing pages                                                                                                   | `SEO_CONTENT_STRATEGY.md`       |
| `/privacy-policy`, `/terms-of-service`                                      | MDX static pages                                                                                                            | —                               |
| `/settings/*`, `/admin/*`                                                   | Account and admin (not indexed)                                                                                             | `AGENTS.md`                     |

`sitemap.xml`, `llms.txt` and `llms-full.txt` are generated from the same
content modules, so a new lab, curve or post appears in all three.

## Current Status

The generation pipeline is implemented and deployed. Production has served real
animations end to end. Verified against the live Cloudflare deployment and the
`curvg-db` D1 database on 2026-08-01.

Implemented and running in production:

- Bilingual English and Chinese product site.
- Formula-sampled SVG previews for Lissajous, rose, hypotrochoid, and Fourier curves.
- Authentication, RBAC, admin, credits, subscriptions, payments, storage, and AI providers.
- Three creation entry points: template, formula, and natural-language description.
- Six-stage planning pipeline: intent, knowledge, curriculum, mathematics, storyboard, scene.
- Structured three-layer IR (objects, timeline, layout) with an editable spec and a drag-adjustable timeline.
- Deterministic `spec → Manim` compiler and renderer QA foundation.
- Cloudflare Workflow durable execution with per-stage checkpoints in D1.
- Python orchestrator for visual-contract and math-contract preflight.
- Cloudflare Sandbox render jobs through Queue, with R2 artifact persistence.
- Preview-then-formal render ladder with contact-sheet and temporal QA.
- Credit reservation, cancellation, version snapshots, MP4/`.py` export.

Implemented and build-verified, awaiting deployment (2026-08-04):

- SEO repositioning: the homepage targets the "math animation maker" cluster
  (free tier confirmed live), `/creator` owns "Manim AI generator", and the
  copy angle was reworked from internal/ops phrasing to market-facing wording
  in both locales. Decisions recorded in `docs/SEO_CONTENT_STRATEGY.md` §0.
- Curve encyclopedia (`/curves`): 30 bilingual editorial entries with
  interactive SVG parameter previews, SSR KaTeX equations, and a
  "generate this animation" handoff into the Creator via `?prompt=`.
  See `docs/CURVE_ENCYCLOPEDIA.md`.
- Marketing page matrix: `/math-animation-tool`, `/free-math-video-creator`,
  `/manim-alternative`, plus the `/blog/best-math-video-apps` listicle —
  one target keyword per page, en/zh, FAQ structured data.
- Sitemap (84 URLs), llms.txt/llms-full.txt, and header/footer internal links
  updated accordingly.
- Animation reliability correction: initial delivery now compiles approved IR
  locally, and a scene-only failure can recover from the five approved planning
  artifacts; model-written Python remains limited to targeted repair. Pending
  production deployment.

Implemented and build-verified, awaiting deployment (2026-10-12):

- Interactive labs `/labs`: 31 bilingual chapters in 7 suites — math
  (functions & calculus: transformations, exponentials & logs, unit circle,
  y = A sin(ωx + φ), derivatives, monotonicity & extrema, bisection, Riemann
  sums; conic sections: ellipse, parabola and focal chords, hyperbola and
  asymptotes, eccentricity; geometry: Pythagoras, inscribed angles,
  similarity & homothety, vectors & the dot product; probability:
  permutations & combinations, binomial, normal & 3σ, law of large numbers)
  and physics (motion: v–t
  graphs, projectiles, circular motion, river crossing; forces & energy:
  inclined plane, mass on a spring, pendulum, energy conservation; waves:
  travelling waves, interference, Doppler effect) — with subject pages
  `/labs/math` and `/labs/physics`, a safe expression engine and board
  spec (`src/lib/board`), draggable points, pan/zoom, answer bands, status
  readouts, annotation pen, guided steps that ease the board between states.
  Per-chapter SEO: one H1, `LearningResource` + `Quiz` + `BreadcrumbList`
  structured data, real-board share images. Old `/labs/{chapter}` URLs 301.
- Site-wide "paper & amber" theme and a new logo, shared with the lab
  workspace: serif headings (Noto Serif SC), Instrument Serif display
  numerals, JetBrains Mono labels; dark mode is the lab's Studio palette.
  New default share image and per-post covers. See `docs/DESIGN_SYSTEM.md`.
- Interaction pass: sticky header with current-page state, mobile menu that
  closes on navigation and Escape, smooth FAQ disclosures, branded 404 and
  error pages with ways forward, library hubs and curve pages linking labs.
- Labs-first IA: four-entry nav (Labs and Resources dropdowns, Make a video,
  Pricing), a homepage built around a live lab board and a topic search, and
  a footer "Free tools" column for the traffic pages.

Built, not yet published:

- Lab lesson films (`pnpm video:labs`): each chapter's guide steps drive a
  narrated, captioned MP4 (16:9 and 9:16) rendered from the live board, no
  model in the loop. Served from R2 via `/media/labs/*` once
  `pnpm video:labs:publish` runs; waiting on a production TTS voice. See
  `docs/LABS_PLAN.md` §4.1.

Not implemented yet:

- Most editorial scene pages (`/library/scenes/{slug}`). Two scenes are
  public (`parabola-rise`, `permutations-vs-combinations`); the P1 target is
  at least eight, plus P2 paths and filters. See `docs/LIBRARY_PLAN.md`.
- The public gallery page. Gallery API routes exist; there is no gallery page
  route and no published entry in production. UGC gallery stays separate from
  the editorial library.
- Project editor over saved works.
- SymPy or equivalent symbolic verification.
- Published pricing tiers. Credits are wired, but no tier is on sale pending
  real per-render cost data.

### Reliability model

Delivery is designed around a valid artifact rather than a successful provider call:

- When upstream models are saturated, the Workflow queues and retries on a
  widening ladder (~17 minutes) with a live "retrying automatically" banner,
  instead of hard-failing in seconds. A third admin-configured
  OpenAI-compatible failover route can be added behind KIE GPT-6.1 Sol, the
  only model in routing since 2026-10-14.
- Initial code delivery is deterministic: the approved spec is compiled locally,
  so a successful planning response does not depend on a second model response
  containing 14k tokens of Python.
- If the scene provider fails after intent, knowledge, curriculum, mathematics,
  and storyboard have all passed validation, the pipeline assembles a
  conservative scene from those approved artifacts. It preserves the request's
  formulas and shot order, records `diagnostic.kind=deterministic_scene_fallback`,
  and is not used when upstream artifacts are missing. Earlier-stage failures
  still queue and retry, then fail visibly when the retry budget is exhausted.
- Historical data still contains the retired silent substitutions: on
  2026-07-31, 71% of one day's "successful" stages used that mechanism. New
  recovery rows are explicitly diagnosable rather than indistinguishable from
  provider-produced scenes.
- Credits settle only on success: planning never charges, and the render
  reservation is revoked on failure, cancellation, and callback errors. A
  short balance is flagged before planning starts, not after the wait.
- Every provider attempt — including failures a later target recovers from —
  is persisted to `animation_planning_attempt` (2026-08-04), so provider
  health is measured from attempts, not delivery counts. Format repair gets
  three bounded rounds on the scene stage (two elsewhere), each with its own
  provider time window, and a completed render must carry a plausible MP4
  artifact.
- The wait itself shows the six-stage pipeline with per-stage artifacts
  (knowledge spine, curriculum beats, formulas, shot list), a cancel button,
  and a completion toast.

See [deterministic scene recovery](docs/ANIMATION_ORCHESTRATION.md#deterministic-fallback)
for the recovery boundary, its lineage guarantees, and historical telemetry.

## Workflow

```text
Template, formula, or teaching goal
  → six-stage planning (intent, knowledge, curriculum, mathematics, storyboard, scene)
  → inspectable three-layer IR: objects, timeline, layout
  → editable spec and drag-adjustable timeline
  → deterministic IR → Manim compilation
  → optional model/Python repair only when render evidence requires it
  → isolated sandbox render
  → preview and export artifacts
```

Code is read-only in the product — edits belong in the spec. It can be read,
copied, and exported as `.py`.

The intended design (`docs/CREATOR_REQUIREMENTS.md` §5) is now the initial
delivery path: the model emits IR, and `compileAnimationSpec` owns the Python
source. `composeAnimationCode` remains available for targeted repair after a
renderer or visual-quality diagnostic; it is no longer a prerequisite for the
first render. This removes a major source of model-output variance and long
planning-to-render waits.

Editing the spec by hand recompiles directly without a model call. Sending a
natural-language revision goes through the model using the current spec,
including hand edits, as the draft.

AI output is not assumed to be mathematically correct. Human review sits
between generation and rendering.

## Tech Stack

- TanStack Start, Vite 8, Nitro, React 19, TypeScript strict mode.
- Tailwind CSS 4 and shadcn/ui v4.
- TanStack Query, Form, Router, and Table.
- better-auth and Drizzle ORM.
- Paraglide JS for English and Chinese localization.
- Cloudflare Workers for orchestration.
- Cloudflare D1 for product metadata.
- Cloudflare R2 for source files, previews, videos, thumbnails, and logs.
- Cloudflare Sandbox as the isolated Manim execution layer (deployed as the `curvg-renderer` Worker).
- Cloudflare Workflows for durable multi-stage planning.
- Python orchestrator container for visual- and math-contract preflight.

## Local Development

Requirements: Node.js, pnpm.

```bash
pnpm install
cp .env.example .env.development
# Set a local AUTH_SECRET before using authentication.
pnpm db:setup
pnpm db:push
pnpm rbac:init
pnpm dev
```

The development server runs at `http://localhost:3000`.

## Front-end structure

Public pages follow the repo's block / component split (see `AGENTS.md`):

- `src/blocks/site-page.tsx` — `SitePage`: shell + header + `<main>` + footer
  for every public page except the lab workspace. New pages use it instead of
  repeating the scaffold.
- `src/blocks/status-page.tsx` — 404 and error pages (lazy-loaded from
  `__root.tsx` so the root bundle stays small).
- `src/components/faq-list.tsx` — the FAQ list used by the homepage and pricing.
- Labs: `src/lib/board/*` (expression parser, spec, pure evaluator),
  `src/components/lab-board.tsx` (SVG renderer + state hook),
  `src/components/lab-workspace.tsx` (full-screen workspace),
  `src/content/labs/*` (subjects, suites, chapters), `src/routes/labs/*`.
- Styles: theme tokens and shared `curvg-*` classes in
  `src/styles/globals.css`; the lab workspace in `src/styles/lab-workspace.css`
  (`.lw-*`, scoped).

## Generated assets

Raster images are rendered from code with the site's own fonts, so they stay
in step with the theme. Rerun after changing the source:

| Command         | Writes                                                            | When                                                                    |
| --------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm og:labs`  | `public/og/labs/{slug}.{lang}.png` (needs `pnpm dev` running)     | a board changed or a chapter was added (a test fails if one is missing) |
| `pnpm og:brand` | `public/og/curvg-social.png`, `public/og/posts/{slug}.{lang}.png` | the social SVG changed, or a post was added or retitled                 |

The logo is `public/logo.svg` (also `favicon.svg`); `apple-touch-icon.png`
is a 180px raster of it.

## Validation

```bash
pnpm build
pnpm test
pnpm cf:build
```

`pnpm build` verifies the standard Nitro production build. `pnpm cf:build` verifies the Cloudflare Workers module build without deploying it.

## Cloudflare Deployment

The committed deployment template is `wrangler.example.jsonc`. The working `wrangler.jsonc` is intentionally gitignored because it contains real Cloudflare resource identifiers.

Production deployment requires:

1. A D1 database binding named `DB`.
2. Production `AUTH_SECRET` and `CONFIG_ENCRYPTION_KEY` secrets.
3. R2 configuration before enabling render artifact storage.
4. A reviewed migration generated with `pnpm db:generate`.
5. A separate Sandbox integration for Manim execution.

Do not run generated or user-supplied code inside the Worker process.

## Documentation

Current architecture:

- [Animation orchestration](docs/ANIMATION_ORCHESTRATION.md) — Workflow, provider routing, deterministic fallback, quality ladder. Start here.
- [Creator architecture](docs/CURVG_CREATOR_ARCHITECTURE.md) — creator product, state machine, security and renderer boundaries.
- [Creator requirements](docs/CREATOR_REQUIREMENTS.md) — the decisions behind the deterministic-compiler design.
- [Cloudflare deployment](docs/CLOUDFLARE_DEPLOYMENT.md)

Product and planning:

- [Project brief](docs/PROJECT_BRIEF.md)
- [Roadmap](docs/ROADMAP.md)
- [Site architecture plan](docs/SITE_ARCHITECTURE_PLAN.md)
- [SEO and content strategy](docs/SEO_CONTENT_STRATEGY.md)
- [Curve encyclopedia](docs/CURVE_ENCYCLOPEDIA.md)
- [Interactive labs plan](docs/LABS_PLAN.md) — `/labs` IA, URL and redirect rules, per-chapter SEO, reserved slots (video, physics), new-chapter checklist.
- [Scene library plan](docs/LIBRARY_PLAN.md) — editorial `/library`. P0 skeleton is implemented; scene pages are not. Source of truth for Hub/topic/scene IA, the math content graph, and what must not be copied from animg.app or shapeof.world.
- [Design system](docs/DESIGN_SYSTEM.md) — the 2026-10-12 "paper & amber" section at the top overrides older colour, type and logo notes below it.

Research:

- [AnimG competitor analysis](docs/research/animg.app/COMPETITOR_ANALYSIS.md)
- [Homepage topology](docs/research/PAGE_TOPOLOGY.md)
- [Homepage behaviors](docs/research/BEHAVIORS.md)

## Commands

| Command            | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `pnpm dev`         | Start the local development server                              |
| `pnpm build`       | Build the standard Nitro production target                      |
| `pnpm cf:build`    | Build the Cloudflare Workers module target                      |
| `pnpm db:setup`    | Select the schema template for the configured database          |
| `pnpm db:push`     | Apply schema changes during local development                   |
| `pnpm db:generate` | Generate reviewable production migrations                       |
| `pnpm db:migrate`  | Apply pending production migrations                             |
| `pnpm rbac:init`   | Seed default roles and permissions                              |
| `pnpm test`        | Unit tests (pipeline, board engine, lab content, library graph) |
| `pnpm og:labs`     | Regenerate lab share images (dev server running)                |
| `pnpm og:brand`    | Regenerate the default share image and post covers              |

## License

This repository is private and uses the terms in [LICENSE](LICENSE).
