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
	<title>Multiplayer - MUG</title>
</svelte:head>

<div>
	<h1 class="text-3xl font-bold mb-4">Multiplayer</h1>
	<p class="text-gray-400">Multiplayer mode is coming soon!</p>
	<a href="/home" class="mt-4 inline-block text-purple-400 hover:text-purple-300 underline"
		>Return to Home</a
	>
</div>
