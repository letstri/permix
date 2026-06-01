# Permix Cursor skills (for application developers)

These skills teach AI assistants how to integrate [Permix](https://permix.letstri.dev) in **your** app — not how to hack on the Permix library itself.

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
| [permix-frontend](./permix-frontend/SKILL.md) | React, Vue, or Solid UI integration |
| [permix-server](./permix-server/SKILL.md) | Express, Hono, Fastify, tRPC, oRPC middleware |
| [permix-ssr](./permix-ssr/SKILL.md) | `dehydrate` / `hydrate`, Next.js, TanStack Start |

Official docs: https://permix.letstri.dev/docs
