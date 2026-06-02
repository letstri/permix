<script lang="ts">
import type { Snippet } from 'svelte'
import type { DehydratedState } from '../core'
import { untrack } from 'svelte'
import { usePermixContext } from './context.svelte'

const { state, children }: { state: DehydratedState<any>, children: Snippet } = $props()

const context = usePermixContext()

untrack(() => context.permix.hydrate(state))
</script>

{@render children()}
