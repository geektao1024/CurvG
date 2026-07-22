# Cloudflare Deployment Record

Last verified: 2026-07-22

## Current status

- Worker: `curvg`
- Temporary URL: <https://curvg.471787092.workers.dev>
- D1: `curvg-db` (APAC), schema migration applied
- R2: `curvg-assets`
- Production build: `pnpm cf:build` passes
- Live checks: homepage returns HTTP 200, expected title renders, and `/api/config/public` reads successfully

## Domain blocker

`curvg.com` is not currently available as a Cloudflare Zone and has no delegated nameserver records. The Worker therefore cannot attach the custom domain yet. Add the domain to this Cloudflare account and update its registrar nameservers before replacing the temporary Workers URL.

## Sandbox assessment

Cloudflare Sandbox is suitable for a CurvG MVP because it supports custom Linux container images, Python command execution, filesystem operations, and R2-backed persistence. The intended split is:

- Workers: HTTP API, authentication, orchestration
- D1: users, jobs, metadata, billing state
- Sandbox/Containers: isolated Manim, FFmpeg, and LaTeX rendering
- R2: source files, rendered video, thumbnails, and exports

The platform capability is verified from Cloudflare documentation, but a real Manim render has not yet been benchmarked. Before production use, run representative scenes and measure cold start, render time, memory, concurrency, and cost.

## Official references

- [Sandbox SDK overview](https://developers.cloudflare.com/sandbox/)
- [Custom Sandbox Dockerfiles](https://developers.cloudflare.com/sandbox/configuration/dockerfile/)
- [Sandbox lifecycle](https://developers.cloudflare.com/sandbox/concepts/sandboxes/)
- [Container limits](https://developers.cloudflare.com/containers/platform-details/limits/)
- [Container pricing](https://developers.cloudflare.com/containers/pricing/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
