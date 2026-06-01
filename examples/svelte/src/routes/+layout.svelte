<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { PermixProvider } from 'permix/svelte';
	import { permix } from '$lib/permix';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<PermixProvider {permix}>
	{@render children()}
</PermixProvider>
