<script lang="ts" generics="D extends Definition">
import type { Snippet } from 'svelte'
import type { Definition, Permix } from '../core'
import { providePermix } from './context.svelte'

const { permix, children }: { permix: Permix<D>, children: Snippet } = $props()

// svelte-ignore state_referenced_locally
providePermix(permix)
</script>

{@render children()}
