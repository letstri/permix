<script lang="ts">
import type { Snippet } from 'svelte'
import type { DehydratedState } from '../core'
import { untrack } from 'svelte'
import { usePermixContext } from './context.svelte'

const { state, children }: { state: DehydratedState<any>, children: Snippet } = $props()

const context = usePermixContext()

// Hydrate before children render, and again whenever `state` changes.
$effect.pre(() => {
  const next = state
  untrack(() => context.permix.hydrate(next))
})
</script>

{@render children()}
