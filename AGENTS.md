# Agent guide (Permix repository)

This repo is the **Permix** monorepo (library v4, docs site, examples). Most agents here are **maintainers** working on the package, docs, or examples.

## Consumer skills (for app developers)

Skills for teams **using** Permix ship in the published npm package at [`permix/skills/`](permix/skills/README.md). Repo-root [`skills/permix`](skills/permix) is a symlink alias (same pattern as [redux-toolkit/skills](https://github.com/reduxjs/redux-toolkit/tree/master/skills)) so CI and GitHub resolve skills from the monorepo root. Consumers install via [TanStack Intent](https://tanstack.com/intent/latest/docs/overview) (`pnpm dlx @tanstack/intent@latest install`) or copy from `node_modules/permix/skills/`.

Repo-root [`_artifacts/`](_artifacts/skill_tree.yaml) (`domain_map.yaml`, `skill_spec.md`, `skill_tree.yaml`) tracks skill coverage and source-doc references for CI staleness checks.

When you change public API behavior, docs examples, or integration patterns, keep `permix/skills/` aligned with `docs/content/docs/` and `examples/`, bump `library_version` in SKILL frontmatter on release, and run `cd permix && pnpm run skills:stale`.

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
| `permix/skills/` | Agent skills shipped in the npm package (TanStack Intent) |
| `skills/permix` | Symlink → `permix/skills/` for monorepo-root discovery and CI |
| `_artifacts/` | Intent domain map, skill spec, and skill tree for CI staleness |

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
