<script lang="ts">
import type { Permix } from '../../core'
import PermixProvider from '../PermixProvider.svelte'
import HookConsumer from './HookConsumer.svelte'

const { permix }: { permix: Permix<{ post: [{ name: 'create', type: { id: string } }, 'read'] }> } = $props()
</script>

<PermixProvider {permix}>
  <HookConsumer {permix} />
</PermixProvider>
