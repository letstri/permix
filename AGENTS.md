# Agent guide (Permix repository)

This repo is the **Permix** monorepo (library v4, docs site, examples). Most agents here are **maintainers** working on the package, docs, or examples.

## Consumer skills (for app developers)

Skills for teams **using** Permix in their own apps live in [`skills/`](skills/README.md). Copy them into a consumer project’s `.cursor/skills/` directory — do not rely on agents reading this repo alone.

When you change public API behavior, docs examples, or integration patterns, keep `skills/` aligned with `docs/content/docs/` and `examples/`.

## Repository layout

| Path | Purpose |
|------|---------|
| `permix/` | Published npm package (`permix`); build inside this folder |
| `permix/src/core/` | Core API (`createPermix`, `setup`, `check`, `template`, `merge`, events) |
| `permix/src/<framework>/` | Adapters (`react`, `vue`, `express`, `trpc`, `next`, …) |
| `docs/` | Documentation site (Fumadocs + TanStack Start) |
| `docs/content/docs/` | MDX documentation pages |
| `docs/src/routes/` | App routes; homepage code samples in `docs/src/routes/-code/` |
| `examples/` | Runnable sample apps — reference when validating integrations |
| `skills/` | Cursor skills for **application developers** (not maintainers) |

Docs site: https://permix.letstri.dev — machine-readable exports: `/llms.txt` and `/llms-full.txt` on the docs app.

## Maintainer commands

From repo root (pnpm workspace: `permix`, `docs`, `examples/*`):

```bash
pnpm install
pnpm test && pnpm run check-types
pnpm run lint
cd permix && pnpm run build
cd docs && pnpm dev          # http://localhost:3000
cd docs && pnpm types:check  # fumadocs-mdx + tsc for docs only
```

Do not commit unless the user asks.
