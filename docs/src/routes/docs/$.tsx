import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import browserCollections from 'collections/browser'
import { useFumadocsLoader } from 'fumadocs-core/source/client'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page'
import { Suspense } from 'react'
import { useMDXComponents } from '@/components/mdx'
import { SidebarScrollFix } from '@/components/sidebar-scroll'
import { baseOptions } from '@/lib/layout.shared'
import { gitConfig } from '@/lib/shared'
import { slugsToMarkdownPath, source } from '@/lib/source'

const serverLoader = createServerFn({
  method: 'GET',
})
  .inputValidator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs)
    if (!page) {
      throw notFound()
    }

    return {
      path: page.path,
      slugs: page.slugs,
      markdownUrl: slugsToMarkdownPath(page.slugs).url,
      pageTree: await source.serializePageTree(source.getPageTree()),
    }
  })

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: MDX },
    {
      markdownUrl,
      path,
    }: {
      markdownUrl: string
      path: string
    },
  ) {
    // eslint-disable-next-line react/rules-of-hooks
    const components = useMDXComponents()

    return (
      <DocsPage
        toc={toc}
        tableOfContent={{ style: 'clerk' }}
        full={'full' in frontmatter ? frontmatter.full : undefined}
      >
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription className="mb-0">{frontmatter.description}</DocsDescription>
        <div className="-mt-4 flex flex-row items-center gap-2 border-b pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/docs/content/docs/${path}`}
          />
        </div>
        <DocsBody>
          <MDX components={components} />
        </DocsBody>
      </DocsPage>
    )
  },
})

export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/') ?? []
    const data = await serverLoader({ data: slugs })
    await clientLoader.preload(data.path)
    return data
  },
})

function Page() {
  const { path, pageTree, markdownUrl } = useFumadocsLoader(Route.useLoaderData())

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      <SidebarScrollFix />
      <Suspense>{clientLoader.useContent(path, { markdownUrl, path })}</Suspense>
    </DocsLayout>
  )
}
