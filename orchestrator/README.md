# CurvG Python Orchestrator

This service is the deterministic boundary between CurvG's model routing and
the Cloudflare Sandbox renderer. It does not own user accounts, credits,
provider credentials, D1 state, or Manim execution.

It provides:

- Pydantic validation for the versioned animation specification.
- A machine-readable visual contract derived from the approved scene.
- Deterministic template retrieval for common mathematical visual structures.
- Structural mathematical-contract checks.
- A Python AST preflight and targeted repair directives.

The service deliberately does not claim to prove arbitrary mathematics. Exact
numeric or symbolic claims still require explicit deterministic checks in the
animation specification and the existing independent model audit.

## Local run

```bash
cd orchestrator
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
ORCHESTRATOR_TOKEN=local-secret uvicorn app.main:app --port 8080
```

Configure CurvG with:

```env
ANIMATION_ORCHESTRATOR_URL=http://localhost:8080
ANIMATION_ORCHESTRATOR_TOKEN=local-secret
```

Production URLs must use HTTPS. If this service is not configured or is
temporarily unavailable, CurvG falls back to its existing in-Worker compiler
and renderer path.

## Cloudflare Containers

The production adapter is a small authenticated Worker that load-balances two
stateless Container instances. Both the Worker edge and FastAPI service verify
the same bearer token.

```bash
openssl rand -base64 32 | pnpm exec wrangler secret put \
  ORCHESTRATOR_TOKEN --config orchestrator/wrangler.jsonc
pnpm orchestrator:deploy
```

After the first deployment is ready, configure the main CurvG Worker with the
deployed HTTPS URL and the same token. Cloudflare may need several minutes to
provision a new Container image; a temporary HTTP 503 during that window is
retryable and the animation Workflow falls back to the in-Worker path after its
bounded retries.
