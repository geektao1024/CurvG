# CurvG

CurvG is a math curve animation gallery and a formula-first animation generator in development. The product is designed to keep equations, scene plans, generated Manim code, and render artifacts inspectable instead of treating mathematical animation as an opaque text-to-video task.

Website: [curvg.com](https://curvg.com)

## Current Status

The repository currently contains the product foundation, not the finished AI renderer.

Available now:

- Bilingual English and Chinese product site.
- Formula-sampled SVG previews for Lissajous, rose, hypotrochoid, and Fourier curves.
- Authentication, RBAC, admin, credits, subscriptions, payments, storage, and AI provider foundations.
- Local SQLite development setup.
- Cloudflare Workers, D1, and R2 deployment wiring.
- Documented Cloudflare Sandbox rendering architecture.

Not implemented yet:

- AI formula and mathematical-intent parsing.
- Structured scene planning and editable Manim generation.
- Cloudflare Sandbox render jobs.
- Dynamic curve gallery data and project editor.
- Production render queue, artifacts, and usage-based pricing.

## Intended Workflow

```text
Equation or teaching goal
  → structured mathematical input
  → inspectable scene plan
  → editable Manim code
  → isolated sandbox render
  → preview and export artifacts
```

AI output is not assumed to be mathematically correct. The target workflow keeps human review between generation and rendering.

## Tech Stack

- TanStack Start, Vite 8, Nitro, React 19, TypeScript strict mode.
- Tailwind CSS 4 and shadcn/ui v4.
- TanStack Query, Form, Router, and Table.
- better-auth and Drizzle ORM.
- Paraglide JS for English and Chinese localization.
- Cloudflare Workers for orchestration.
- Cloudflare D1 for product metadata.
- Cloudflare R2 for source files, previews, videos, thumbnails, and logs.
- Cloudflare Sandbox as the planned isolated Manim execution layer.

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

- [Project brief](docs/PROJECT_BRIEF.md)
- [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
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
