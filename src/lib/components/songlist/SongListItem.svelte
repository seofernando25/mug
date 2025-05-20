<!-- src/lib/components/songlist/SongListItem.svelte -->
<script lang="ts">
	import type { SongListItem, ChartListItem } from '$lib/client/api';
	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition'; // For smooth expansion

	export let song: SongListItem;
	export let selectedSongId: string | null = null;
	export let selectedDifficultyId: string | null = null; // Keep track of selected difficulty

	// Full chart details will be fetched when a song is selected for the main panel,
	// but for the list, we might only have difficulty names or simplified chart info.
	// For now, this component assumes `song.difficulties` is an array of strings as per SongListItem.
	// If `song.charts` (actual ChartListItem[]) is available, that could be used too.

	const dispatch = createEventDispatcher();

	let expanded = false;

	function toggleExpand() {
		expanded = !expanded;
		if (expanded) {
			dispatch('songselected', { songId: song.id });
		} else {
			// Optional: dispatch an event if deselection logic is needed when collapsing
			// dispatch('songdeselected', { songId: song.id });
		}
	}

	function selectDifficulty(difficultyName: string) {
		// Here, you would ideally have the chart ID for the selected difficulty.
		// For now, we'll use the song ID and difficulty name to navigate.
		// The actual chart ID might be part of a richer ChartListItem if fetched.
		console.log(`Difficulty selected: ${difficultyName} for song ${song.title}`);
		dispatch('difficultyselected', { songId: song.id, difficultyName });
		// Construct the href for navigation
		// The actual navigation will be handled by the parent page, this just signals selection
	}

	$: isSelected = song.id === selectedSongId;
</script>

<div
	class="bg-gray-750 rounded-md shadow transition-all duration-150 ease-in-out mb-2"
	class:ring-2={isSelected && !expanded}
	class:ring-purple-500={isSelected && !expanded}
	class:bg-gray-700={!isSelected || expanded}
	class:hover:bg-gray-650={!expanded}
>
	<button
		on:click={toggleExpand}
		class="w-full text-left p-3 focus:outline-none flex items-center"
		style:background-image={song.imageUrl
			? `linear-gradient(to right, rgba(31, 41, 55, 0.9), rgba(55, 65, 81, 0.7)), url(${song.imageUrl})`
			: ''}
		class:bg-cover={!!song.imageUrl}
		class:bg-center={!!song.imageUrl}
		class:rounded-md={!expanded}
		class:rounded-t-md={expanded}
	>
		<div class="flex-grow">
			<h3
				class="text-lg font-semibold"
				class:text-purple-300={isSelected || expanded}
				class:text-white={!isSelected && !expanded}
			>
				{song.title}
			</h3>
			<p class="text-sm" class:text-gray-400={!expanded} class:text-gray-300={expanded}>
				{song.artist}
			</p>
		</div>
		<span
			class="text-xs text-gray-400 transform transition-transform duration-200"
			class:rotate-90={expanded}
		>
			▶
		</span>
	</button>

	{#if expanded}
		<div
			transition:slide|local={{ duration: 200 }}
			class="p-3 border-t border-gray-700 bg-gray-800 rounded-b-md"
		>
			<p class="text-sm text-gray-300 mb-2">Difficulties:</p>
			{#if song.difficulties && song.difficulties.length > 0}
				<ul class="space-y-1">
					{#each song.difficulties as difficultyName (difficultyName)}
						<li>
							<a
								href={`/solo/play/${song.id}?difficulty=${encodeURIComponent(difficultyName)}`}
								on:click|preventDefault={() => selectDifficulty(difficultyName)}
								class="block w-full text-left p-2 rounded hover:bg-purple-600 transition-colors text-gray-200 hover:text-white"
								class:bg-purple-500={selectedDifficultyId === `${song.id}-${difficultyName}`}
								class:text-white={selectedDifficultyId === `${song.id}-${difficultyName}`}
							>
								{difficultyName}
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-gray-500">No difficulties listed for this song.</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.bg-gray-750 {
		background-color: #374151; /* A color between gray-700 and gray-800 */
	}
	.hover\:bg-gray-650:hover {
		background-color: #4b5563; /* A color between gray-600 and gray-700 for hover */
	}
</style>
