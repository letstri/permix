import type { auth } from './auth'
import type { Definition } from './permix'
import { createAuthClient } from 'better-auth/client'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { permixClient } from 'permix/better-auth'

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), permixClient<Definition>()],
})
