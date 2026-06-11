# Permix Cursor skills (for application developers)

These skills teach AI assistants how to integrate [Permix](https://permix.letstri.dev) in **your** app — not how to work on the Permix library monorepo.

**Permix v4** uses action tuples (`post: ['read', { name: 'edit', type: Post }]`), not the v3 `{ action, dataType }` shape. Upgrading? See [migration guide](https://permix.letstri.dev/docs/migration-v3-to-v4).

## Install in your project

Copy the skill folders into your app’s `.cursor/skills/` directory:

```bash
# From a clone of the permix repo
cp -r /path/to/permix/skills/permix-* /path/to/your-app/.cursor/skills/
```

Or install only what you need:

```bash
cp -r /path/to/permix/skills/permix-getting-started /path/to/your-app/.cursor/skills/
```

Restart Cursor or start a new agent chat so skills are picked up.

## Skills

| Skill | When to use |
|-------|-------------|
| [permix-getting-started](./permix-getting-started/SKILL.md) | New project, schema, `setup`, roles/templates |
| [permix-check](./permix-check/SKILL.md) | `check`, dynamic rules, ReBAC, `~all` / `~any` |
| [permix-frontend](./permix-frontend/SKILL.md) | React, Vue, Solid, or Svelte UI integration |
| [permix-server](./permix-server/SKILL.md) | Express, Hono, Fastify, tRPC, oRPC middleware |
| [permix-ssr](./permix-ssr/SKILL.md) | `dehydrate` / `hydrate`, Next.js, TanStack Start |

## Without skills

- Official docs: https://permix.letstri.dev/docs
- LLM-oriented exports: https://permix.letstri.dev/llms.txt and https://permix.letstri.dev/llms-full.txt

## Optional integrations (docs only)

These adapters are documented on the site; no dedicated skill yet — use the integration pages:

| Topic | Docs |
|-------|------|
| Effect | https://permix.letstri.dev/docs/integrations/effect |
| Drizzle ORM | https://permix.letstri.dev/docs/integrations/drizzle |
| Events (`hook`, `hookOnce`) | https://permix.letstri.dev/docs/guide/events |

Examples: https://github.com/letstri/permix/tree/main/examples
