import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { baseOptions } from '@/lib/layout.shared'

const initCode = `import { createPermix } from 'permix'

interface Post {
  id: string
  published: boolean
}

// Create the permix instance
export const permix = createPermix<{
  post: {
    dataType: Post
    action: 'create' | 'update' | 'delete'
  }
}>()`

const setupCode = `import { permix } from './permix'

// Fetch the user
const user = await fetchUser()

// Setup the permissions
permix.setup({
  post: {
    create: true,
    edit: post => post ? !post.published : user.role === 'admin',
    delete: user.role === 'admin',
  },
})`

const usageCode = `import { permix } from './permix'

// Can I delete any post?
permix.check('post', 'delete')

const post = await fetchPost()

// Can I edit this post?
permix.check('post', 'edit', post)`

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="min-h-screen">
        <div className="container mx-auto grid grid-cols-1 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="pt-6 lg:pt-24">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              <span className="block">Permix</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-base text-fd-muted-foreground sm:text-lg md:mt-5 md:max-w-3xl md:text-xl">
              A lightweight, framework-agnostic, type-safe permissions management library for client-side and server-side JavaScript applications.
            </p>
          </div>
          <div>
            <Tabs items={['Init', 'Setup', 'Usage']}>
              <Tab value="Init">
                <CodeBlock>
                  <Pre>{initCode}</Pre>
                </CodeBlock>
              </Tab>
              <Tab value="Setup">
                <CodeBlock>
                  <Pre>{setupCode}</Pre>
                </CodeBlock>
              </Tab>
              <Tab value="Usage">
                <CodeBlock>
                  <Pre>{usageCode}</Pre>
                </CodeBlock>
              </Tab>
            </Tabs>
          </div>
        </div>
        <div className="container relative z-10 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {[
            {
              emoji: '🔒',
              title: 'Type-safe',
              description:
                'Permix is built with TypeScript in mind, providing full type safety and autocompletion for your permissions system.',
            },
            {
              emoji: '🌐',
              title: 'Framework Agnostic',
              description:
                'Use Permix with any JavaScript framework or runtime - it works everywhere from React to Node.js.',
            },
            {
              emoji: '🛠️',
              title: 'Simple DX',
              description:
                'Permix provides an intuitive API that makes managing permissions straightforward and easy to understand.',
            },
          ].map(item => (
            <div
              key={item.title}
              className="space-y-2 rounded-lg border border-fd-border bg-fd-card p-4 shadow-sm sm:rounded-xl sm:p-6 lg:rounded-3xl lg:p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fd-accent text-2xl">
                {item.emoji}
              </div>
              <h3 className="mt-6! text-lg font-semibold!">{item.title}</h3>
              <p className="text-fd-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </HomeLayout>
  )
}
