<script lang="ts">
import type { Permix } from '../../core'
import { usePermix } from '../context.svelte'

const { permix }: { permix: Permix<{ post: ['create', 'read'] }> } = $props()

// svelte-ignore state_referenced_locally
const permissions = usePermix(permix)
</script>

<div data-testid="create">{permissions.check('post.create').toString()}</div>
<div data-testid="ready">{permissions.isReady.toString()}</div>
