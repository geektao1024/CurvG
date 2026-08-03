# CurvG Animation Orchestration

## Runtime architecture

```mermaid
flowchart TD
  A[CurvG Worker] --> B[(D1 animation and stage state)]
  A --> C[Provider router: KIE then Kuaipao]
  A --> D[Cloudflare Workflow]
  D --> E[Python Orchestrator]
  E --> F[Visual contract and template retrieval]
  E --> G[Pydantic, math-contract and AST preflight]
  E --> H[Targeted generation or repair brief]
  D --> I[Cloudflare Sandbox Renderer]
  I --> J[Low-quality preview render]
  J --> K[Contact-sheet and temporal QA]
  K -->|repair| E
  K -->|approve| L[Formal 720p30 render]
  L --> M[(R2 versioned artifacts)]
```

The Worker remains the owner of authentication, subscriptions, credits,
provider credentials, model selection, D1 state, and renderer callbacks. The
Python service receives one bounded animation specification at a time and owns
only deterministic planning and preflight decisions.

## Provider routing

`animationProviderTargetPlan` in `src/routes/api/animations/-shared.ts` is the
single source of ordering. It appends KIE first, Kuaipao second, and — when an
administrator has configured all three `animation_backup_*` settings — a third
OpenAI-compatible `/chat/completions` route last:

| Order | Provider  | Model              | Intended role               |
| ----- | --------- | ------------------ | --------------------------- |
| 1     | `kie`     | `gemini-3.6-flash` | Public product model        |
| 2     | `kuaipao` | `gpt-5.6-sol`      | Server-owned recovery route |
| 3     | `backup`  | admin-configured   | Optional third failover     |

The backup route exists because two providers still share fate often enough to
matter: on 2026-08-02 both were saturated at once. It never appears in the
public model catalog — resilience infrastructure, not a product surface.

A stage row records only the provider that ultimately produced the artifact. A
KIE attempt that fails and then succeeds on Kuaipao is stored as
`provider=kuaipao, status=completed` — the KIE failure leaves no row of its
own. Provider counts in `animation_planning_stage` therefore measure delivery,
not attempt volume, and cannot be read as a KIE health metric.

Measure KIE health from Worker logs or by adding per-attempt telemetry. The
intended and the effective primary can diverge silently under this schema.

## Durable execution

The Workflow has three durable boundaries:

1. `plan-animation` runs the six persisted planning specialists. Every stage
   writes its input hash, artifact, attempt, provider diagnostic, and status to
   D1, so a Workflow replay reuses completed stages. When a whole attempt
   fails retryably (saturation, timeouts), the Workflow does not fail after
   two quick tries: it queues, waiting out a widening ladder of
   5s/30s/1m/2m/4m/5m/5m (eight attempts, ~17 minutes end to end). Between
   attempts it persists `parts.queue` (attempt, nextRetryAt, since, reason) so
   the client shows an honest "retrying automatically" banner with a live
   countdown, and it honors cancellation before spending another provider
   call. Only an exhausted ladder or a non-retryable failure becomes a
   visible terminal failure — and planning never charges credits.
2. `prepare-python-orchestrator` derives the visual contract, retrieves visual
   templates, and produces the code-generation brief. Cloudflare retries this
   external step with exponential delay. After the retry budget is exhausted,
   the Workflow records a degraded checkpoint and uses the in-Worker compiler.
3. `compile-and-render-animation` generates code, runs Python AST preflight,
   performs at most one targeted pre-render repair, reserves credits, and
   dispatches the renderer.

The Python service is intentionally optional. A network outage must reduce
quality assistance, not make an otherwise valid animation impossible to
render.

## Versioned contracts

- Transport protocol: `curvg.orchestrator/v1`
- Visual contract: `curvg.visual/v1`
- Animation specification: CurvG schema version 6. Versions 2-5 remain
  readable as archives; the Python orchestrator accepts 5 and 6.

The visual contract makes these requirements machine-readable:

- 16:9 or 9:16 frame and normalized safe zone.
- 30 fps delivery target.
- Visible motion in the first second.
- A resolved payoff in the final third.
- Bounded prose and simultaneous text.
- One dominant visual action per teaching beat.
- Geometry and motion must carry the proof instead of prose alone.

The service returns diagnostics with a stable code, severity, stage, message,
and optional JSON path. Blocking code diagnostics become a targeted repair
directive; warnings remain inspectable and do not stop rendering.

## Validation boundaries

The Python mathematical validator checks the _mathematical contract_: scoped
claim, definitions, derivation, independent checks, limitations, timeline
references, and whether the declared visual action actually demonstrates a
dynamic claim. It does not claim to prove arbitrary mathematics. The existing
independent model audit and any deterministic solver remain responsible for
topic-specific verification.

AST preflight rejects unsupported imports, dynamic evaluation, external file
or URL access, blocked updater patterns, invalid scene inheritance, and scenes
without enough explicit motion. The renderer repeats a stricter AST check in
the disposable Sandbox; preflight is not a replacement for isolation.

## Deterministic fallback

**The failure-triggered substitution described below was retired on
2026-08-03.** A scene stage that fails after its provider failover now
propagates the error to the Workflow queue (see Durable execution) instead of
substituting a deterministic scene. The 2026-08-02 product decision:
queue-then-succeed or fail visibly — never deliver a scene that ignores the
request. The only deterministic scene left is the _pre-matched_ verified
profile (quadratic tangent, cycloid, heart), which runs before any provider
call, only when the prompt matches a hand-verified topic, and only when the
schema-6 dossier gate confirms the dossier actually authors those formulas.

Historical context — why it was retired: when a planning stage exhausted both
providers, the Workflow recorded the stage as `completed` with
`provider=curvg` and a `deterministic-*` model id, and delivery continued from
a pre-authored scene rather than from the user's request.

| Model id                    | Meaning                                      |
| --------------------------- | -------------------------------------------- |
| `deterministic-scene-v1`    | Verified template matched to the request     |
| `deterministic-fallback-v1` | Generic scene; carries little of the request |

This traded a visible error for a silent quality loss: on 2026-07-31, 71% of
completed stages were substituted rather than generated. Because the fallback
was stored as `completed`, completion rate read a total provider outage as
healthy. The split query remains useful for reading historical data:

```sql
select date(created_at/1000,'unixepoch') d,
       case when provider='curvg' then 'substituted' else 'model' end kind,
       count(*) n
from animation_planning_stage
where status='completed'
group by d, kind order by d;
```

Rows with `provider='curvg'` after 2026-08-03 can only come from the
pre-matched verified profiles, which are honest matches, not substitutions.

## Lineage and the ownership gap

The six planning stages derive from the Mythos chain in
[Math-To-Manim](https://github.com/HarleyCoops/Math-To-Manim), which maps
one-to-one:

| Math-To-Manim                         | CurvG                  |
| ------------------------------------- | ---------------------- |
| intent                                | `intent`               |
| cartographer (reverse knowledge tree) | `knowledge`            |
| curriculum                            | `curriculum`           |
| math-director                         | `mathematics`          |
| cinematographer + scene-composer      | `storyboard` + `scene` |

Two of the three ideas that were originally left behind are now carried over
in schema version 6; the third remains open.

**1. The mathematics stage owns the LaTeX** (schema 6). `mathDossier` carries
`formulas` — id'd entries with ordered `latexParts` — and a scene formula
object must name its source through `formulaId` and copy those parts
_verbatim_; `animationSpecSchema` rejects any mismatch. Before this, the
scene stage derived formula content itself: a deterministic template keyed on
a bare `点` (which appears in 切点 / 定点 / 邻近点) once collapsed four
distinct beats onto one formula in production. The keyword matcher was fixed
first, but the schema change removes the defect class rather than one
instance — content with a single owner cannot be invented twice.

**2. Knowledge nodes carry `assumed`, `visualSeed`, and `depth`, and the map
carries `spine`** (schema 6). `assumed` marks what the audience already owns
(a nod, not a lesson), `visualSeed` records the most filmable mental image of
each concept for the storyboard to harvest, `depth` orders concepts from the
target (0) toward foundations, and `spine` is the shortest honest path from
foundations to the depth-0 target — the film walks the spine; everything else
is texture. The schema rejects a spine that references a missing node,
repeats a node, or fails to end at the target.

Versions 2-5 remain readable as archives. Production records predating the
change stay valid without migration, matching the read-only archive policy in
`CREATOR_REQUIREMENTS.md` §6.3.

**3. Camera grammar still has no house rules.** CurvG's timeline `op` set is
comparable to the Mythos verb grammar, but Mythos pairs it with invariants —
"every ZOOM_IN gets a PULL_BACK", "every formula on screen has a live
CAPTION", "at most two text elements visible at once" — that are mechanically
checkable. CurvG enforces none of them yet.

Math-To-Manim's own summary of why this layering exists: _"Charters are the
product. Behavior changes in the chain usually belong in the agent charters,
not in harness code."_

## Scene reconciliation

`validateSceneSemantics` (`src/modules/animations/planning.ts`) runs after the
full-contract check and enforces what the contract cannot express. A scene can
be schema-valid, compile, render, and pass pixel QA while still being
incoherent, so these are checked directly:

- A formula or caption the timeline never shows. Geometry is exempt — axes and
  similar scaffolding are laid out statically.
- Two presentation objects rendering identical content. Compared across both
  formula representations (`parts` and `expr`).
- `fade_out`, `emphasize`, `transform` and similar applied to an object before
  anything has brought it on screen.

Structural reference integrity — unknown object, unknown shot focus — is
already covered by `composeAnimationSpecFromArtifacts` and is not repeated.

## Renderer quality ladder

Each autonomous repair attempt uses Manim `-ql`. The renderer extracts twelve
frames and analyzes occupancy, edge risk, contrast, black/frozen segments, and
flash frames. The quality gate can request a targeted repair and preserves the
highest-ranked preview when later repairs regress.

After approval, the selected source is rendered again with `-qm`. Thumbnail,
contact sheet, and QA JSON are regenerated from that formal MP4, then the
formal video and evidence are uploaded to R2. Preview media is never delivered
as the final artifact.

## Configuration

The service can be configured in Admin Settings or through server-only
environment fallbacks:

```env
ANIMATION_ORCHESTRATOR_URL=https://orchestrator.example.com
ANIMATION_ORCHESTRATOR_TOKEN=<shared bearer token>
```

The same token must be present as `ORCHESTRATOR_TOKEN` in the Python container.
Production URLs must use HTTPS. Local development permits localhost HTTP.

## Verification

```bash
pnpm orchestrator:test
pnpm renderer:typecheck
pnpm test
pnpm build
pnpm cf:build
pnpm exec wrangler deploy --dry-run
```

The default production target is Cloudflare Containers through the dedicated
`orchestrator/wrangler.jsonc` Worker adapter. The Docker image remains
platform-neutral and can
run on Modal, Cloud Run, Fly.io, Railway, or another HTTPS container runtime.
No production service is active until its URL and bearer token are configured.
