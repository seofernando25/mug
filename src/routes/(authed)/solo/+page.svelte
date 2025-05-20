<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const { data } = $props();

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
	<title>Solo - Song Select - MUG</title>
</svelte:head>

<div>
	<h1 class="text-3xl font-bold mb-6">Select Song</h1>

	{#if data.error}
		<div class="text-red-400">{data.error}</div>
	{:else if !data.songs || data.songs.length === 0}
		<!-- Display loading or no songs message based on whether data.songs is undefined (still loading from server) or empty -->
		{#if data.songs === undefined}
			<!-- This check might depend on how SvelteKit streams/resolves load data -->
			<div class="text-gray-400">Loading songs...</div>
		{:else}
			<div class="text-gray-400">No songs available. Import some songs in the Level Creator!</div>
		{/if}
	{:else}
		<div class="space-y-3 max-w-xl">
			{#each data.songs as song (song.id)}
				<a
					href="/solo/play/{song.id}"
					class="block bg-gray-700 hover:bg-gray-600 p-4 rounded-md shadow transition-colors duration-150 ease-in-out"
				>
					<h2 class="text-xl font-semibold text-purple-300">{song.title}</h2>
					<p class="text-sm text-gray-400">{song.artist}</p>
					{#if song.difficulties && song.difficulties.length > 0}
						<p class="text-xs text-gray-500 mt-1">
							Difficulties: {song.difficulties.join(', ')}
						</p>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
	<!-- TODO: Placeholder for leaderboard display -->
</div>
