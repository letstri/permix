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
  EditOnGitHub,
  MarkdownCopyButton,
  PageLastUpdate,
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
      lastModified: page.data.lastModified?.getTime(),
      pageTree: await source.serializePageTree(source.getPageTree()),
    }
  })

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: MDX },
    {
      markdownUrl,
      path,
      lastModified,
    }: {
      markdownUrl: string
      path: string
      lastModified?: number
    }
  ) {
    // eslint-disable-next-line rules-of-hooks
    const components = useMDXComponents()
    const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/docs/content/docs/${path}`

    return (
      <DocsPage
        toc={toc}
        tableOfContent={{ style: 'clerk' }}
        full={'full' in frontmatter ? frontmatter.full : undefined}
      >
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription className="mb-0">
          {frontmatter.description}
        </DocsDescription>
        <div className="-mt-4 flex flex-row items-center gap-2 border-b pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
        </div>
        <DocsBody>
          <MDX components={components} />
        </DocsBody>
        <div className="mt-8 flex flex-row flex-wrap items-center justify-between gap-4">
          <EditOnGitHub href={githubUrl} />
          {lastModified && <PageLastUpdate date={new Date(lastModified)} />}
        </div>
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
  const { path, pageTree, markdownUrl, lastModified } = useFumadocsLoader(
    Route.useLoaderData()
  )

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      <SidebarScrollFix />
      <Suspense>
        {clientLoader.useContent(path, { markdownUrl, path, lastModified })}
      </Suspense>
    </DocsLayout>
  )
}
