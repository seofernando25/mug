<script lang="ts">
	import '../app.css';
	import { username } from "$lib/stores/userStore";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";

	// Assuming TweakpaneManager exists and has toggleVisibility
	// import TweakpaneManager from '$lib/utils/TweakpaneManager'; // Adjust path if needed

	onMount(() => {
		// Example: Initialize Tweakpane if needed
		// TweakpaneManager.init(); // Assuming an init method

		// Add key listener for Tweakpane toggle
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === '~') {
				// TweakpaneManager.toggleVisibility(); // Assuming this method exists
				console.log('Tweakpane toggle triggered (placeholder)');
			}
		};
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			// Optional: Add Tweakpane cleanup if necessary
			// TweakpaneManager.dispose(); // Assuming a dispose method
		};
	});

	// Redirect logic
	$: {
		if (!$username && $page.url.pathname !== '/') {
			console.log('Redirecting to login...', $username, $page.url.pathname);
			goto('/');
		}
	}
</script>

<div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
	<header class="bg-gray-800 p-4 shadow-md">
		<div class="container mx-auto flex justify-between items-center">
			<a href="/home" class="text-xl font-bold text-purple-400 hover:text-purple-300">MUG Rhythm</a>
			<div>
				{#if $username}
					<span>Welcome, {$username}!</span>
				{/if}
			</div>
		</div>
	</header>

	<main class="flex-grow container mx-auto p-4">
		<slot />
	</main>

	<footer class="bg-gray-800 p-2 text-center text-xs text-gray-500">
		MUG MVP
	</footer>
</div>
