<script lang="ts">
import type { Permix } from '../../core'
import { createComponents } from '../components'
import PermixProvider from '../PermixProvider.svelte'

const { permix }: { permix: Permix<{ post: ['create'] }> } = $props()

// svelte-ignore state_referenced_locally
const { Check } = createComponents(permix)
</script>

<PermixProvider {permix}>
  <Check path="post.create" reverse>
    <div>Default slot</div>
    {#snippet otherwise()}
      <div>Otherwise slot</div>
    {/snippet}
  </Check>
</PermixProvider>
