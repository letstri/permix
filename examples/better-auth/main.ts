import { permix } from './permix'

const users = [
  { name: 'Alice', role: 'owner' as const },
  { name: 'Bob', role: 'admin' as const },
  { name: 'Charlie', role: 'member' as const },
]

const paths = [
  'project.create',
  'project.read',
  'project.update',
  'project.delete',
  'billing.view',
  'billing.manage',
  'organization.update',
  'organization.delete',
  'member.create',
  'member.delete',
  'invitation.create',
] as const

console.log('Permix + Better Auth — Access Matrix\n')

const header = ['Permission', ...users.map(u => `${u.name} (${u.role})`)]
const colWidth = 22

console.log(header.map(h => h.padEnd(colWidth)).join(''))
console.log('-'.repeat(colWidth * header.length))

for (const path of paths) {
  const row = [path as string]
  for (const user of users) {
    permix.setup(permix.createRules(user.role))
    row.push(permix.check(path) ? 'yes' : '-')
  }
  console.log(row.map(c => c.padEnd(colWidth)).join(''))
}

console.log('\n--- Override demo ---')
permix.setup({
  ...permix.createRules('member'),
  project: { create: false, read: true, update: false, delete: true },
})
console.log(`member + override => project.delete: ${permix.check('project.delete')}`)

console.log('\n--- Multi-role union demo ---')
permix.setup(permix.createRules(['member', 'admin']))
console.log(`member+admin union => project.create: ${permix.check('project.create')}`)
console.log(`member+admin union => project.delete: ${permix.check('project.delete')}`)

/*
 * --- Client plugin usage ---
 *
 * On the client side, use permixClient to fetch permissions
 * from the server and hydrate the Permix instance:
 *
 * ```ts
 * import { createAuthClient } from 'better-auth/client'
 * import { permixClient } from 'permix/better-auth/client'
 * import { permix } from './permix'
 *
 * const authClient = createAuthClient({
 *   plugins: [permixClient()],
 * })
 *
 * const { data: state } = await authClient.permix.getPermissions()
 * permix.hydrate(state)
 *
 * permix.check('project.create') // type-safe check
 * ```
 */
