<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	interface Song {
		id: string;
		title: string;
		artist: string;
		difficulties: string[];
	}

	let songs: Song[] = [];
	let loading = true;
	let error: string | null = null;

	onMount(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				goto('/home');
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		// Load songs
		fetch('/api/list-songs')
			.then(response => {
				if (!response.ok) {
					throw new Error('Failed to load songs');
				}
				return response.json();
			})
			.then(data => {
				songs = data;
			})
			.catch(e => {
				error = 'Failed to load songs. Please try again later.';
				console.error('Error loading songs:', e);
			})
			.finally(() => {
				loading = false;
			});

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
	{#if loading}
		<div class="text-gray-400">Loading songs...</div>
	{:else if error}
		<div class="text-red-400">{error}</div>
	{:else if songs.length === 0}
		<div class="text-gray-400">No songs available. Import some songs in the Level Creator!</div>
	{:else}
		<div class="space-y-3 max-w-xl">
			{#each songs as song}
				<a
					href="/solo/play/{song.id}"
					class="block bg-gray-700 hover:bg-gray-600 p-4 rounded-md shadow transition-colors duration-150 ease-in-out"
				>
					<h2 class="text-xl font-semibold text-purple-300">{song.title}</h2>
					<p class="text-sm text-gray-400">{song.artist}</p>
					{#if song.difficulties.length > 0}
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
