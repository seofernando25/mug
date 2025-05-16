<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				goto('/home');
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

<svelte:head>
	<title>About - MUG</title>
</svelte:head>

<div>
	<h1 class="text-3xl font-bold mb-4">About MUG</h1>
	<p class="mb-2">MUG is a web-based rhythm game built with Svelte, PixiJS, and Tailwind CSS.</p>
	<p class="text-gray-400">More information about the project will go here.</p>
	<a href="/home" class="mt-4 inline-block text-purple-400 hover:text-purple-300 underline"
		>Return to Home</a
	>
</div>
