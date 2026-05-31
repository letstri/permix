/**
 * Example: Better Auth server setup with permixPlugin.
 *
 * This file shows how to register the permix server plugin
 * alongside the organization plugin. The `rules` callback
 * converts the user's role into Permix rules.
 *
 * NOTE: This is a standalone example — it won't run without
 * a database and Better Auth configuration. See the Better Auth
 * docs for full setup: https://www.better-auth.com
 */

import { betterAuth } from 'better-auth'
import { organization } from 'better-auth/plugins'
import { permixPlugin } from 'permix/better-auth'
import { ac, roles } from './permissions'
import { permix } from './permix'

export const auth = betterAuth({
  // ... your database, email, etc.
  plugins: [
    organization({ ac, roles }),
    permixPlugin({
      rules: (session: { user: { role: string } }) =>
        permix.createRules(session.user.role as 'member' | 'admin' | 'owner'),
    }),
  ],
})
