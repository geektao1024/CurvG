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
- Deterministic `spec → Manim` compiler, currently used as the fallback when model code composition fails.
- Cloudflare Workflow durable execution with per-stage checkpoints in D1.
- Python orchestrator for visual-contract and math-contract preflight.
- Cloudflare Sandbox render jobs through Queue, with R2 artifact persistence.
- Preview-then-formal render ladder with contact-sheet and temporal QA.
- Credit reservation, cancellation, version snapshots, MP4/`.py` export.

Not implemented yet:

- Curve encyclopedia (`/curves`) and the public gallery page. Gallery API routes
  exist; there is no gallery page route and no published entry in production.
- Project editor over saved works.
- SymPy or equivalent symbolic verification.
- Published pricing tiers. Credits are wired, but no tier is on sale pending
  real per-render cost data.

### Reliability model

Delivery is honest by construction (decided 2026-08-02, shipped 2026-08-03):

- When upstream models are saturated, the Workflow queues and retries on a
  widening ladder (~17 minutes) with a live "retrying automatically" banner,
  instead of hard-failing in seconds. A third admin-configured
  OpenAI-compatible failover route can be added behind KIE and Kuaipao.
- Failure-triggered scene substitution is retired: a run either delivers
  model-planned content (or a pre-matched, hand-verified topic profile) or
  fails visibly. On 2026-07-31, 71% of one day's "successful" stages had been
  silent substitutions; that mechanism is gone.
- Credits settle only on success: planning never charges, and the render
  reservation is revoked on failure, cancellation, and callback errors. A
  short balance is flagged before planning starts, not after the wait.
- The wait itself shows the six-stage pipeline with per-stage artifacts
  (knowledge spine, curriculum beats, formulas, shot list), a cancel button,
  and a completion toast.

See
[Deterministic fallback](docs/ANIMATION_ORCHESTRATION.md#deterministic-fallback)
for the retirement record and the query that separates substituted from
model-delivered stages in historical data.

## Workflow

```text
Template, formula, or teaching goal
  → six-stage planning (intent, knowledge, curriculum, mathematics, storyboard, scene)
  → inspectable three-layer IR: objects, timeline, layout
  → editable spec and drag-adjustable timeline
  → Python: model composition, with deterministic compilation as fallback
  → isolated sandbox render
  → preview and export artifacts
```

Code is read-only in the product — edits belong in the spec. It can be read,
copied, and exported as `.py`.

Note that the intended design (`docs/CREATOR_REQUIREMENTS.md` §5) is for the
compiler to own all Python and the model to emit only IR. The IR landed; the
ownership inversion did not. `composeAnimationCode`
(`src/modules/animations/service.ts:686`) still asks the model for Python first
and falls back to `compileAnimationSpec` only after two failures. This is
tracked as a P0 in the roadmap — it is a shared root cause of timeouts,
exhausted Workflow budgets, and output variance.

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
