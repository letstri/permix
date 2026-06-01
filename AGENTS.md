# Agent guide (Permix repository)

This repo is the **Permix library** source. Most agents here are **maintainers** working on the package or docs.

## Consumer skills (for app developers)

Skills for teams **using** Permix in their own apps live in [`skills/`](skills/README.md). They are meant to be copied into a consumer project’s `.cursor/skills/` directory — not consumed only from this monorepo.

## Maintainer quick reference

| Path | Purpose |
|------|---------|
| `permix/src/core/` | Core API |
| `permix/src/<framework>/` | Integrations |
| `docs/content/docs/` | Public docs |

```bash
pnpm test && pnpm run check-types
cd permix && pnpm run build
cd docs && pnpm dev
```

Do not commit unless the user asks.
