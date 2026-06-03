# Permix

[![npm version](https://badge.fury.io/js/permix.svg)](https://npmjs.com/package/permix)
![You need Permix](https://img.shields.io/badge/You_need-Permix-purple)

Permix is a lightweight, framework-agnostic, type-safe permissions management library for JavaScript applications on the client and server sides.

## Documentation

You can find the documentation [here](https://permix.letstri.dev).

## Example

To quick start you only need to write the following code:

```ts
import { createPermix } from 'permix'

const permix = createPermix<{
  post: ['read']
}>()

permix.setup({
  post: {
    read: true,
  }
})

permix.check('post.read') // true
```

Permix has other powerful features, so here's check out the [docs](https://permix.letstri.dev/docs) or the [examples](https://github.com/letstri/permix/tree/main/examples) directory.

## Cursor skills

Copy [skills/](skills/README.md) into your app’s `.cursor/skills/` so AI assistants follow Permix patterns (setup, check, React, server middleware, SSR).

## License

MIT License - see the [LICENSE](https://github.com/letstri/permix/blob/main/LICENSE) file for details
