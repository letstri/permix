# Permix agent skills

These skills teach AI assistants how to integrate [Permix](https://permix.letstri.dev) in **your** app — not how to work on the Permix library monorepo.

**Permix v4** uses action tuples (`post: ['read', { name: 'edit', type: Post }]`), not the v3 `{ action, dataType }` shape. Upgrading? See [migration guide](https://permix.letstri.dev/docs/migration-v3-to-v4).

Skills ship inside the `permix` npm package and are versioned with each release. They include `sources` metadata pointing at docs and source files so maintainers can detect drift when documentation changes.

## Install

After adding Permix to your project, copy the skill folders into your agent's skills directory (`.agents/skills/`, `.claude/skills/`, …):

```bash
pnpm add permix
cp -r node_modules/permix/skills/permix .agents/skills/
cp -r node_modules/permix/skills/permix-getting-started .agents/skills/
```

Restart your editor or start a new agent chat so skills are picked up. When you `pnpm update permix`, re-copy to pick up the new version — knowledge travels through npm, not model training cutoffs.

## Skills

| Skill | When to use |
| --- | --- |
| [permix-getting-started](./permix-getting-started/SKILL.md) | New project, schema, `setup`, roles/templates |
| [permix](./permix/SKILL.md) | Everything past setup: `check`/ReBAC (`references/check.md`), React/Vue/Solid/Svelte + SSR (`references/frontend.md`), Express/Hono/Fastify/NestJS/tRPC/oRPC middleware (`references/server.md`) |

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

Keep `permix/skills/` aligned with `docs/content/docs/` and `examples/` when public API behavior changes, and update `library_version` in SKILL frontmatter when cutting a release.
