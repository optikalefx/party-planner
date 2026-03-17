<script lang="ts">
	import favicon from '$lib/assets/logo.png';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex, useConvexClient } from 'convex-svelte';
	import { initAuth } from '$lib/auth.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	setupConvex(PUBLIC_CONVEX_URL);
	const client = useConvexClient();

	onMount(() => {
		initAuth(PUBLIC_CONVEX_URL, client);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
