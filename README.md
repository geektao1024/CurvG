# CurvG

CurvG is a math curve animation gallery and a formula-first animation generator in development. The product is designed to keep equations, scene plans, generated Manim code, and render artifacts inspectable instead of treating mathematical animation as an opaque text-to-video task.

Website: [curvg.com](https://curvg.com)

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

Not implemented yet:

- The public gallery page. Gallery API routes exist; there is no gallery page
  route and no published entry in production.
- Project editor over saved works.
- SymPy or equivalent symbolic verification.
- Published pricing tiers. Credits are wired, but no tier is on sale pending
  real per-render cost data.

### Reliability model

Delivery is designed around a valid artifact rather than a successful provider call:

- When upstream models are saturated, the Workflow queues and retries on a
  widening ladder (~17 minutes) with a live "retrying automatically" banner,
  instead of hard-failing in seconds. A third admin-configured
  OpenAI-compatible failover route can be added behind KIE and Kuaipao.
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

## Validation

```bash
pnpm build
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
- [Design system](docs/DESIGN_SYSTEM.md)

Research:

- [AnimG competitor analysis](docs/research/animg.app/COMPETITOR_ANALYSIS.md)
- [Homepage topology](docs/research/PAGE_TOPOLOGY.md)
- [Homepage behaviors](docs/research/BEHAVIORS.md)

## Commands

| Command            | Purpose                                                |
| ------------------ | ------------------------------------------------------ |
| `pnpm dev`         | Start the local development server                     |
| `pnpm build`       | Build the standard Nitro production target             |
| `pnpm cf:build`    | Build the Cloudflare Workers module target             |
| `pnpm db:setup`    | Select the schema template for the configured database |
| `pnpm db:push`     | Apply schema changes during local development          |
| `pnpm db:generate` | Generate reviewable production migrations              |
| `pnpm db:migrate`  | Apply pending production migrations                    |
| `pnpm rbac:init`   | Seed default roles and permissions                     |

## License

This repository is private and uses the terms in [LICENSE](LICENSE).
