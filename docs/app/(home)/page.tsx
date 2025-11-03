import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import InitCode from './code/init.mdx'
import SetupCode from './code/setup.mdx'
import UsageCode from './code/usage.mdx'

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="container grid grid-cols-1 lg:grid-cols-2 mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="pt-6 lg:pt-24">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            <span className="block">Permix</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-fd-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            A lightweight, framework-agnostic, type-safe permissions management library for client-side and server-side JavaScript applications.
          </p>
        </div>
        <div>
          <Tabs items={['Init', 'Setup', 'Usage']}>
            <Tab value="Init">
              <CodeBlock>
                <Pre>
                  <InitCode />
                </Pre>
              </CodeBlock>
            </Tab>
            <Tab value="Setup">
              <CodeBlock>
                <Pre>
                  <SetupCode />
                </Pre>
              </CodeBlock>
            </Tab>
            <Tab value="Usage">
              <CodeBlock>
                <Pre>
                  <UsageCode />
                </Pre>
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
        ].map((item) => {
          return (
            <div
              key={item.title}
              className="space-y-2 rounded-lg shadow-sm bg-fd-card p-4 sm:rounded-xl border-fd-border border sm:p-6 lg:rounded-3xl lg:p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fd-accent text-2xl">
                {item.emoji}
              </div>
              <h3 className="text-lg font-semibold! mt-6!">{item.title}</h3>
              <p
                className="text-fd-muted-foreground"
                // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
                dangerouslySetInnerHTML={{ __html: item.description }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
