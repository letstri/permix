import type { Metadata } from 'next'
import * as Twoslash from 'fumadocs-twoslash/ui'
import * as StepsComponents from 'fumadocs-ui/components/steps'
import * as TabsComponents from 'fumadocs-ui/components/tabs'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page'
import { notFound } from 'next/navigation'
import { getMDXComponents } from '@/app/mdx-components'
import { LLMCopyButton, ViewOptions } from '@/components/ai/page-actions'
import { source } from '@/lib/source'

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params
  const page = source.getPage(params.slug)

  if (!page)
    notFound()

  const MDX = page.data.body
  const markdownUrl = page.url === '/docs' ? '/docs/index.mdx' : `${page.url}.mdx`

  return (
    <DocsPage toc={page.data.toc} tableOfContent={{ style: 'clerk' }} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <LLMCopyButton markdownUrl={markdownUrl} />
        <ViewOptions
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/letstri/permix/blob/main/docs/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
            ...TabsComponents,
            ...StepsComponents,
            ...Twoslash,
          })}
        />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(
  props: PageProps<'/docs/[[...slug]]'>,
): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)

  if (!page)
    notFound()

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
