<script lang="ts">
import type { Permix } from '../../core'
import { usePermix } from '../context.svelte'

const { permix }: { permix: Permix<{ post: [{ name: 'create', type: { id: string } }, 'read'] }> } = $props()

// svelte-ignore state_referenced_locally
const permissions = usePermix(permix)

const post = { id: '1' }
</script>

<div>
  <span data-testid="create">{permissions.check('post.create', post).toString()}</span>
  <span data-testid="read">{permissions.check('post.read').toString()}</span>
  <span data-testid="ready">{permissions.isReady.toString()}</span>
</div>
