<script lang="ts">
import type { DehydratedState, Permix } from '../../core'
import HydrateConsumer from './HydrateConsumer.svelte'
import PermixHydrate from '../PermixHydrate.svelte'
import PermixProvider from '../PermixProvider.svelte'

const { permix, state }: {
  permix: Permix<{ post: ['create', 'read'] }>
  state: DehydratedState<{ post: ['create', 'read'] }>
} = $props()
</script>

<PermixProvider {permix}>
  <PermixHydrate {state}>
    <HydrateConsumer {permix} />
  </PermixHydrate>
</PermixProvider>
