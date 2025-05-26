<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { SongListItem } from './types';

	const {
		songListItem,
		selectedSongId,
		selectedDifficultyId,
		songselected,
		difficultyselected
	}: {
		songListItem: SongListItem;
		selectedSongId: string;
		selectedDifficultyId: string;
		songselected: () => void;
		difficultyselected: (difficultyName: string) => void;
	} = $props();

	let expanded = $state(false);

	function toggleExpand() {
		expanded = !expanded;
		if (expanded) {
			songselected();
		} else {
			// Optional: dispatch an event if deselection logic is needed when collapsing
			// dispatch('songdeselected', { songId: song.id });
		}
	}

	function selectDifficulty(difficultyName: string) {
		// If difficulties were objects with IDs: selectDifficulty(chartId: string, difficultyName: string)
		// console.log(`Difficulty selected: ${difficultyName} for song ${song.title}`);

		difficultyselected(difficultyName);
		// Construct the href for navigation
		// The actual navigation will be handled by the parent page, this just signals selection
	}

	let isSelected = $derived(songListItem.id === selectedSongId);
</script>

<!-- The song is selected when hovered over -->
<div
	onmouseenter={() => {
		songselected();
	}}
	role="button"
	tabindex="-1"
	class="bg-gray-750 rounded-md shadow transition-all duration-150 ease-in-out mb-2"
	class:ring-2={isSelected && !expanded}
	class:ring-purple-500={isSelected && !expanded}
	class:bg-gray-700={!isSelected || expanded}
	class:hover:bg-gray-650={!expanded}
>
	<button
		onclick={toggleExpand}
		class="w-full text-left p-3 focus:outline-none flex items-center"
		style:background-image={songListItem.imageUrl
			? `linear-gradient(to right, rgba(31, 41, 55, 0.9), rgba(55, 65, 81, 0.7)), url(${songListItem.imageUrl})`
			: ''}
		class:bg-cover={!!songListItem.imageUrl}
		class:bg-center={!!songListItem.imageUrl}
		class:rounded-md={!expanded}
		class:rounded-t-md={expanded}
	>
		<div class="flex-grow">
			<h3
				class="text-lg font-semibold"
				class:text-purple-300={isSelected || expanded}
				class:text-white={!isSelected && !expanded}
			>
				{songListItem.title}
			</h3>
			<p class="text-sm" class:text-gray-400={!expanded} class:text-gray-300={expanded}>
				{songListItem.artist}
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
			{#if songListItem.difficulties && songListItem.difficulties.length > 0}
				<ul class="space-y-1">
					{#each songListItem.difficulties as difficultyName (difficultyName)}
						<li>
							<a
								href={`/solo/play/${songListItem.id}?difficulty=${encodeURIComponent(difficultyName)}`}
								onclick={(e) => {
									e.preventDefault();
									selectDifficulty(difficultyName);
								}}
								class="block w-full text-left p-2 rounded hover:bg-purple-600 transition-colors text-gray-200 hover:text-white"
								class:bg-purple-500={selectedDifficultyId ===
									`${songListItem.id}-${difficultyName}`}
								class:text-white={selectedDifficultyId === `${songListItem.id}-${difficultyName}`}
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
