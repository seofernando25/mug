<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		fetchSongs,
		fetchSongDetails,
		type SongListItem,
		type SongDetail
	} from '$lib/client/api';

	import SongSearchSort from '$lib/components/songlist/SongSearchSort.svelte';
	import SongListItemComponent from '$lib/components/songlist/SongListItem.svelte';
	import SongDetailPanel from '$lib/components/songlist/SongDetailPanel.svelte';

	let allSongs: SongListItem[] = [];
	let filteredSongs: SongListItem[] = [];
	let selectedSongDetails: SongDetail | null = null;
	let currentError: string | null = null;
	let isLoadingSongs = true;
	let isLoadingDetails = false;

	let searchTerm = '';
	let selectedSongId: string | null = null; // For highlighting in the list and fetching details
	// let selectedDifficultyId: string | null = null; // If needed to pass down for highlighting difficulty

	onMount(async () => {
		isLoadingSongs = true;
		const response = await fetchSongs();
		if (response.error) {
			currentError = response.error;
			allSongs = [];
		} else {
			allSongs = response.songs;
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

	async function handleSongSelected(event: CustomEvent<{ songId: string }>) {
		const songId = event.detail.songId;
		if (selectedSongId === songId) {
			// If the same song is clicked again (intended for collapsing via SongListItem),
			// we might not want to deselect or re-fetch.
			// The SongListItem component handles its own `expanded` state.
			// However, if the panel should clear, or if selection means always showing details:
			// selectedSongId = null;
			// selectedSongDetails = null;
			// For now, let's assume clicking an expanded song does nothing here, or re-fetches.
			selectedSongId = songId; // Keep it selected
		} else {
			selectedSongId = songId;
		}

		// Only fetch details if a song is actually selected to be shown in the panel
		if (selectedSongId) {
			isLoadingDetails = true;
			currentError = null;
			const response = await fetchSongDetails(selectedSongId);
			if (response.error) {
				currentError = response.error;
				selectedSongDetails = null;
			} else {
				selectedSongDetails = response.song || null;
			}
			isLoadingDetails = false;
		}
	}

	function handleDifficultySelected(
		event: CustomEvent<{ songId: string; difficultyName: string }>
	) {
		const { songId, difficultyName } = event.detail;
		// Navigate to the play page
		// Assuming chartId is part of the route or query param for play page
		// If your play page needs the chart ID, ensure `fetchSongDetails` in `handleSongSelected`
		// makes the full chart objects (with IDs) available, then find the correct chartId here.
		console.log(`Navigating to play song: ${songId}, difficulty: ${difficultyName}`);
		goto(`/solo/play/${songId}?difficulty=${encodeURIComponent(difficultyName)}`);
	}

	function handleSearch(event: CustomEvent<string>) {
		searchTerm = event.detail;
		filterSongs();
	}

	function handleSort(event: CustomEvent<string>) {
		const sortBy = event.detail;
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
		{:else}
			<SongDetailPanel song={selectedSongDetails} />
		{/if}
	</div>

	<!-- Right Panel: Song List -->
	<div class="w-2/3 xl:w-3/5 flex flex-col">
		<SongSearchSort bind:searchTerm on:search={handleSearch} on:sort={handleSort} />

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
							{song}
							{selectedSongId}
							on:songselected={handleSongSelected}
							on:difficultyselected={handleDifficultySelected}
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
