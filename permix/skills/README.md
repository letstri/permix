# Permix agent skills (TanStack Intent)

These skills teach AI assistants how to integrate [Permix](https://permix.letstri.dev) in **your** app — not how to work on the Permix library monorepo.

**Permix v4** uses action tuples (`post: ['read', { name: 'edit', type: Post }]`), not the v3 `{ action, dataType }` shape. Upgrading? See [migration guide](https://permix.letstri.dev/docs/migration-v3-to-v4).

Skills ship inside the `permix` npm package and are versioned with each release. They include `sources` metadata pointing at docs and source files so maintainers can detect drift when documentation changes.

## Install via npm (recommended)

After adding Permix to your project:

```bash
pnpm add permix
pnpm dlx @tanstack/intent@latest install
```

Intent discovers `permix` in `node_modules`, reads the skills bundled with your installed version, and writes lightweight skill-loading guidance into your agent config (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, etc.).

List or load a specific skill:

```bash
pnpm dlx @tanstack/intent@latest list
pnpm dlx @tanstack/intent@latest load permix#permix
```

When you `pnpm update permix`, skills update with the package — knowledge travels through npm, not model training cutoffs.

## Manual install (Cursor)

Copy skill folders into `.agents/skills/`:

```bash
cp -r node_modules/permix/skills/permix .agents/skills/
cp -r node_modules/permix/skills/permix-getting-started .agents/skills/
```

Restart Cursor or start a new agent chat so skills are picked up.

## Skills

| Skill | Intent id | When to use |
| --- | --- | --- |
| [permix-getting-started](./permix-getting-started/SKILL.md) | `permix#permix-getting-started` | New project, schema, `setup`, roles/templates |
| [permix](./permix/SKILL.md) | `permix#permix` | Everything past setup: `check`/ReBAC (`references/check.md`), React/Vue/Solid/Svelte + SSR (`references/frontend.md`), Express/Hono/Fastify/NestJS/tRPC/oRPC middleware (`references/server.md`) |

## Registry and version history

The package includes the `tanstack-intent` npm keyword. Published versions are indexed on the [Agent Skills Registry](https://tanstack.com/intent/registry) with skill history per release.

## Without skills

- Official docs: https://permix.letstri.dev/docs
- LLM-oriented exports: https://permix.letstri.dev/llms.txt and https://permix.letstri.dev/llms-full.txt

## Optional integrations (docs only)

| Topic | Docs |
| --- | --- |
| Effect | https://permix.letstri.dev/docs/integrations/effect |
| Drizzle ORM | https://permix.letstri.dev/docs/integrations/drizzle |
| Events (`hook`, `hookOnce`) | https://permix.letstri.dev/docs/guide/events |

Examples: https://github.com/letstri/permix/tree/main/examples

## Maintainer workflow (this repo)

From `permix/`:

```bash
pnpm run skills:validate   # structure + packaging before publish
pnpm run skills:stale      # flag drift vs docs/sources
```

CI runs `intent validate` on PRs and `intent stale` after releases (`.github/workflows/check-skills.yml`). Update `library_version` in SKILL frontmatter when cutting a release.
