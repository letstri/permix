import * as icons from '@remixicon/react'
import { docs } from 'collections/server'
import { loader } from 'fumadocs-core/source'
import { createElement } from 'react'
import { docsRoute, siteUrl } from './shared'

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
  icon(icon) {
    if (!icon) {
      return
    }

    if (icon in icons) {
      return createElement(icons[icon as keyof typeof icons])
    }

    throw new Error(`Icon not found: ${icon}`)
  },
})

export function markdownPathToSlugs(segs: string[]) {
  if (segs.length === 0) {
    return []
  }

  const out = [...segs]
  out[out.length - 1] = out[out.length - 1].replace(/\.md$/, '')
  if (out.length === 1 && out[0] === 'index') {
    out.pop()
  }
  return out
}

export function slugsToMarkdownPath(slugs: string[]) {
  const segments = [...slugs]
  if (segments.length === 0) {
    segments.push('index.md')
  }
  else {
    segments[segments.length - 1] += '.md'
  }

  return {
    segments,
    url: `${docsRoute}/${segments.join('/')}`,
  }
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed')

  return `# ${page.data.title}
URL: ${siteUrl}${page.url}

${page.data.description}

${processed}`
}
