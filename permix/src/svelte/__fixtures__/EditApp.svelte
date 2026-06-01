<script lang="ts">
import type { Permix } from '../../core'
import { createComponents } from '../components'
import PermixProvider from '../PermixProvider.svelte'

const { permix, authorId }: {
  permix: Permix<{ post: [{ name: 'edit', type: { authorId: string } }] }>
  authorId: string
} = $props()

// svelte-ignore state_referenced_locally
const { Check } = createComponents(permix)
</script>

<PermixProvider {permix}>
  <Check path="post.edit" data={{ authorId }}>
    <div data-testid="post-can-be-created">Post can be created</div>
    {#snippet otherwise()}
      <div data-testid="otherwise">Post cannot be created</div>
    {/snippet}
  </Check>
</PermixProvider>
