import { GithubInfo } from 'fumadocs-ui/components/github-info'
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

import { appName, gitConfig } from './shared'

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    nav: {
      title: appName,
      transparentMode: 'top',
    },
    links: [
      {
        text: 'Documentation',
        url: '/docs',
        active: 'nested-url',
      },
      {
        type: 'custom',
        children: <GithubInfo owner={gitConfig.user} repo={gitConfig.repo} />,
        secondary: true,
        on: 'menu',
      },
    ],
  }
}
