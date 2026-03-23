<script lang="ts">
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
	<link rel="icon" href="/logo.png" />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Inter:wght@400;500;600&family=Special+Elite&display=swap" rel="stylesheet">
</svelte:head>

{@render children()}

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		font-family: 'Inter', system-ui, sans-serif;
		background: var(--surface-dim);
		color: var(--on-surface);
		min-height: 100vh;

		/* ── Murder Mystery Design Tokens ── */

		/* Surfaces — deep midnight navy */
		--surface-dim: #0e0f1a;
		--surface: #151624;
		--surface-container-low: #1a1b2e;
		--surface-container: #21223a;
		--surface-container-high: #2a2b48;
		--surface-container-highest: #343556;

		/* Primary — Burgundy / Oxblood */
		--primary: #722F37;
		--primary-light: #c4686f;
		--primary-container: #4a1820;

		/* Secondary — Antique Gold */
		--secondary: #C9A96E;
		--secondary-light: #e0c992;
		--secondary-dim: #8a7340;

		/* Tertiary — Aged Parchment */
		--tertiary: #F5F0E8;
		--tertiary-muted: #b8b0a0;

		/* Text */
		--on-surface: #F5F0E8;
		--on-surface-muted: rgba(245, 240, 232, 0.55);
		--on-surface-faint: rgba(245, 240, 232, 0.25);

		/* Outline */
		--outline-variant: rgba(201, 169, 110, 0.15);

		/* Fonts */
		--font-display: 'Playfair Display', 'Georgia', serif;
		--font-body: 'Inter', system-ui, sans-serif;
		--font-evidence: 'Special Elite', 'Courier New', monospace;
	}
</style>
