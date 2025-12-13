<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { fade } from "svelte/transition";
import { orpcClient } from "$lib/rpc/client";
import SongWheel, { type SongWheelItem } from "$lib/components/song-select/SongWheel.svelte";
import SongDetailPanel from "./SongDetailPanel.svelte";
import type { SongListItem } from "./types";

let allSongs = $state<SongListItem[]>([]);
let currentError = $state<string | null>(null);
let isLoadingSongs = $state(true);

let searchTerm = $state("");
let selectedSongId = $state<string | null>(null);
const selectedSong = $derived(
	allSongs.find((song) => song.id === selectedSongId),
);

// Convert to SongWheelItem format
const wheelSongs = $derived<SongWheelItem[]>(
	allSongs.map((song) => ({
		id: song.id,
		title: song.title,
		artist: song.artist,
		imageUrl: song.imageUrl,
		difficulties: song.difficulties,
	})),
);

onMount(async () => {
	isLoadingSongs = true;
	try {
		const response = await orpcClient.song.list({});
		allSongs = response.items;
		// Auto-select first song
		if (allSongs.length > 0 && !selectedSongId) {
			selectedSongId = allSongs[0].id;
		}
	} catch (error) {
		console.error("Error fetching songs:", error);
		currentError = "Failed to fetch songs";
	}
	isLoadingSongs = false;
});

function handleSongSelect(song: SongWheelItem) {
	selectedSongId = song.id;
}

function handleSongConfirm(song: SongWheelItem) {
	// Navigate to play the first difficulty by default
	const fullSong = allSongs.find((s) => s.id === song.id);
	const difficulty = fullSong?.difficulties?.[0] || "Normal";
	goto(`/solo/play/${song.id}?difficulty=${encodeURIComponent(difficulty)}`);
}

function handleSearchChange(term: string) {
	searchTerm = term;
}
</script>

<svelte:head>
	<title>Solo - Song Select - MUG</title>
</svelte:head>

<div class="fixed inset-0 flex overflow-hidden bg-gray-900 text-white font-sans select-none">
	<!-- Dynamic Background -->
	{#key selectedSong?.id}
		<div
			class="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-105"
			style="background-image: url({selectedSong?.imageUrl}); filter: blur(24px) brightness(0.3);"
			transition:fade={{ duration: 500 }}
		></div>
		<div class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent"></div>
	{/key}

	{#if isLoadingSongs}
		<div class="relative z-10 flex-1 flex items-center justify-center">
			<div class="animate-pulse text-2xl font-light tracking-widest text-cyan-400">
				LOADING SONGS...
			</div>
		</div>
	{:else if currentError && allSongs.length === 0}
		<div class="relative z-10 flex-1 flex items-center justify-center">
			<div class="bg-red-900/80 border border-red-500 p-6 rounded-xl text-center backdrop-blur-sm">
				<h2 class="text-xl font-bold mb-2">Error</h2>
				<p class="text-red-200">{currentError}</p>
				<button
					onclick={() => goto('/home')}
					class="mt-4 px-6 py-2 bg-white text-red-900 font-bold rounded hover:bg-gray-200"
				>
					RETURN HOME
				</button>
			</div>
		</div>
	{:else}
		<!-- Left Panel: Song Details -->
		<div class="relative z-10 w-[40%] h-full flex flex-col">
			{#if selectedSong}
				<SongDetailPanel song={selectedSong} />
			{:else}
				<div class="flex-1 flex items-center justify-center">
					<p class="text-xl text-gray-500">Select a song to see details</p>
				</div>
			{/if}
		</div>

		<!-- Right Panel: Song Wheel -->
		<div class="relative z-10 w-[60%] h-full flex flex-col">
			<SongWheel
				songs={wheelSongs}
				{selectedSongId}
				onSelect={handleSongSelect}
				onConfirm={handleSongConfirm}
				{searchTerm}
				onSearchChange={handleSearchChange}
				showSearch={true}
			/>
		</div>
	{/if}
</div>
