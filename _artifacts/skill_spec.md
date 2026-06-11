# Permix — Agent skill specification

Library: **permix** @ 4.1.1  
Repository: https://github.com/letstri/permix  
Docs: https://permix.letstri.dev/docs

## Purpose

These skills teach coding agents how to integrate Permix v4 in consumer applications: schema design, `setup`, `check`, UI adapters, server middleware, and SSR hydration. They are derived from `docs/content/docs/` and `permix/src/` — not from model training cutoffs.

## Skill inventory

| Slug | Type | Domain | Load when |
|------|------|--------|-----------|
| `permix-getting-started` | core | core-setup | New Permix install, schema, roles, templates |
| `permix-check` | core | authorization | `check`, ReBAC, `~all`/`~any`, readiness |
| `permix-frontend` | core | frontend | React, Vue, Solid, Svelte providers and hooks |
| `permix-server` | core | server | Express, Hono, Fastify, tRPC, oRPC middleware |
| `permix-ssr` | sub-skill | ssr | dehydrate/hydrate, Next.js, TanStack Start |

## Dependency graph

```text
permix-getting-started
├── permix-check
│   ├── permix-frontend
│   │   └── permix-ssr
│   └── permix-server
```

## Critical failure modes

See `_artifacts/domain_map.yaml` → `failure_modes`. Highest priority:

1. **v3 schema shape in v4 projects** — use action tuples, not `{ action, dataType }`.
2. **hydrate without client `setup`** — dynamic rules are lost in JSON; always `setup` after hydrate.
3. **Client-only checks** — mirror paths on server with `setupMiddleware` + `checkMiddleware`.

## Source-of-truth policy

When `docs/content/docs/` or public API in `permix/src/` changes:

1. Update the affected `permix/skills/*/SKILL.md` and bump `library_version` on release.
2. Run `pnpm run skills:stale` from `permix/` (or monorepo CI `intent stale`).
3. Align `sources` in SKILL frontmatter with the changed doc paths.

## Out of scope (docs-only for now)

- `permix/effect`, `permix/drizzle` — documented at https://permix.letstri.dev/docs/integrations/effect and `/drizzle`; no dedicated skill yet.

## Registry

Package keyword `tanstack-intent` enables discovery on the [Agent Skills Registry](https://tanstack.com/intent/registry). Each npm release re-indexes skills and version history automatically.
