<script lang="ts">
import type { Snippet } from 'svelte'
import type { DehydratedState } from '../core'
import { usePermixContext } from './context.svelte'

const { state, children }: { state: DehydratedState<any>, children: Snippet } = $props()

const context = usePermixContext()

// svelte-ignore state_referenced_locally
context.permix.hydrate(state)
</script>

{@render children()}
