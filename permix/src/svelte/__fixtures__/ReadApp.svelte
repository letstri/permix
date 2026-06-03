<script lang="ts">
import type { Permix } from '../../core'
import { createComponents } from '../components'
import PermixProvider from '../PermixProvider.svelte'

const { permix }: { permix: Permix<{ post: ['read'] }> } = $props()

// svelte-ignore state_referenced_locally
const { Check } = createComponents(permix)
</script>

<PermixProvider {permix}>
  <Check path="post.read">
    <span data-testid="read">Post can be read</span>
  </Check>
</PermixProvider>
