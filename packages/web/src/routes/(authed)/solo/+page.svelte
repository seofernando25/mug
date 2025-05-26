<script lang="ts">
	import { onMount } from 'svelte';
	import SongSearchSort from '$lib/components/songlist/SongSearchSort.svelte';
	import { orpcClient } from '$lib/rpc-client';
	import SongDetailPanel from './SongDetailPanel.svelte';
	import SongListItemComponent from './SongListItem.svelte';
	import type { SongListItem } from './types';
	import { goto } from '$app/navigation';

	let allSongs = $state<SongListItem[]>([]);
	let filteredSongs = $derived(allSongs);
	let currentError = $state<string | null>(null);
	let isLoadingSongs = $state(true);
	let isLoadingDetails = $state(false);

	let searchTerm = $state('');
	let selectedSongId = $state<string>('');
	let selectedSong = $derived(allSongs.find((song) => song.id === selectedSongId));
	let selectedDifficultyId = $state<string>('');

	onMount(async () => {
		isLoadingSongs = true;
		try {
			const response = await orpcClient.song.list({});
			allSongs = response.items;
		} catch (error) {
			console.error('Error fetching songs:', error);
			currentError = 'Failed to fetch songs';
		}
		filterSongs(); // Initial filter (shows all if searchTerm is empty)
		isLoadingSongs = false;
	});

	function filterSongs() {
		if (!searchTerm) {
			filteredSongs = allSongs;
		} else {
			const lowerSearchTerm = searchTerm.toLowerCase();
			filteredSongs = allSongs.filter(
				(song) =>
					song.title.toLowerCase().includes(lowerSearchTerm) ||
					song.artist.toLowerCase().includes(lowerSearchTerm)
			);
		}
	}

	function handleSearch(searchTerm: string) {
		searchTerm = searchTerm;
		filterSongs();
	}

	function handleSort(sortBy: string) {
		console.log('Sort by:', sortBy);
		// Implement actual sorting logic here based on `sortBy` value
		// For example:
		if (sortBy === 'title') {
			allSongs.sort((a, b) => a.title.localeCompare(b.title));
		} else if (sortBy === 'artist') {
			allSongs.sort((a, b) => a.artist.localeCompare(b.artist));
		}
		// Add other sort cases (BPM will need song details if not in SongListItem)
		filterSongs(); // Re-apply filter after sorting
	}
</script>

<svelte:head>
	<title>Solo - Song Select - MUG</title>
</svelte:head>

<div class="flex h-screen bg-gray-900 text-white">
	<!-- Left Panel: Song Details & Scoreboard -->
	<div class="w-1/3 xl:w-2/5 p-0 border-r border-gray-700 overflow-y-auto">
		{#if isLoadingDetails}
			<div class="flex items-center justify-center h-full">
				<p class="text-xl text-gray-500">Loading song details...</p>
			</div>
		{:else if selectedSong}
			<SongDetailPanel song={selectedSong} />
		{:else}
			<div class="flex items-center justify-center h-full">
				<p class="text-xl text-gray-500">No song selected</p>
			</div>
		{/if}
	</div>

	<!-- Right Panel: Song List -->
	<div class="w-2/3 xl:w-3/5 flex flex-col">
		<SongSearchSort bind:searchTerm search={handleSearch} sort={handleSort} />

		<div class="flex-grow p-4 overflow-y-auto">
			{#if isLoadingSongs}
				<p class="text-center text-gray-400">Loading songs...</p>
			{:else if currentError && allSongs.length === 0}
				<div class="text-center text-red-400 p-4 bg-red-900/30 rounded-md">
					<p>Error loading songs: {currentError}</p>
					<p>Please check the API endpoint or server logs.</p>
				</div>
			{:else if filteredSongs.length === 0 && searchTerm}
				<p class="text-center text-gray-400">No songs found matching "{searchTerm}".</p>
			{:else if filteredSongs.length === 0}
				<p class="text-center text-gray-400">
					No songs available. Import some songs in the Level Creator!
				</p>
			{:else}
				<div class="space-y-2">
					{#each filteredSongs as song (song.id)}
						<SongListItemComponent
							{selectedSongId}
							songselected={() => {
								selectedSongId = song.id;
							}}
							songListItem={song}
							{selectedDifficultyId}
							difficultyselected={(difficultyName: string) => {
								if (difficultyName === selectedDifficultyId) {
									// Goto the song stage
									goto(`/solo/play/${song.id}?difficulty=${difficultyName}`);
								} else {
									selectedDifficultyId = difficultyName;
								}
							}}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Ensure full height for scrolling regions */
	.h-screen {
		height: 100vh;
	}
	/* Basic scrollbar styling for webkit browsers */
	::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}
	::-webkit-scrollbar-track {
		background: #1f2937; /* bg-gray-800 */
	}
	::-webkit-scrollbar-thumb {
		background: #4b5563; /* bg-gray-600 */
		border-radius: 4px;
	}
	::-webkit-scrollbar-thumb:hover {
		background: #6b7280; /* bg-gray-500 */
	}
</style>
