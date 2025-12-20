<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { fade } from "svelte/transition";
import { orpcClient } from "$lib/rpc/client";
import SongWheel, { type SongWheelItem } from "$lib/components/song-select/SongWheel.svelte";
import SongDetailPanel from "./SongDetailPanel.svelte";
import BottomBar from "$lib/components/BottomBar.svelte";
import type { SongListItem } from "./types";

let allSongs = $state<SongListItem[]>([]);
let currentError = $state<string | null>(null);
let isLoadingSongs = $state(true);

let searchTerm = $state("");
let selectedSongId = $state<string | null>(null);
let selectedDifficulty = $state<string>("");
let audioElement = $state<HTMLAudioElement | undefined>();

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
		audioUrl: song.audioUrl,
		previewStartTime: song.previewStartTime
	})),
);

// Handle Song Preview
$effect(() => {
	if (selectedSong && audioElement) {
		// Stop previous
		audioElement.pause();
		
		const url = selectedSong.audioUrl;
		
		if (url) {
			audioElement.src = url;
			// Convert ms to seconds
			const startMs = selectedSong.previewStartTime ?? 0;
			audioElement.currentTime = startMs > 0 ? startMs / 1000 : 0;
			audioElement.volume = 0; // Start silent for fade in
			
			const playPromise = audioElement.play();
			if (playPromise !== undefined) {
				playPromise
					.then(() => {
						// Fade in volume
						let vol = 0;
						const fadeInterval = setInterval(() => {
							if (!audioElement || audioElement.paused) {
								clearInterval(fadeInterval);
								return;
							}
							vol += 0.05;
							if (vol >= 0.3) { // Target volume
								vol = 0.3;
								audioElement.volume = vol;
								clearInterval(fadeInterval);
							} else {
								audioElement.volume = vol;
							}
						}, 50);
					})
					.catch((e) => console.warn("Preview auto-play blocked/failed:", e));
			}
		}
	} else if (audioElement) {
		audioElement.pause();
	}
});

onMount(async () => {
	isLoadingSongs = true;
	try {
		const response = await orpcClient.song.list({});
		allSongs = response.items;
		// Auto-select first song
		if (allSongs.length > 0 && !selectedSongId) {
			selectedSongId = allSongs[0].id;
			if (allSongs[0].difficulties?.length > 0) {
				selectedDifficulty = allSongs[0].difficulties[0];
			}
		}
	} catch (error) {
		console.error("Error fetching songs:", error);
		currentError = "Failed to fetch songs";
	}
	isLoadingSongs = false;
});

function handleSongSelect(song: SongWheelItem) {
	selectedSongId = song.id;
	if (song.difficulties && song.difficulties.length > 0) {
		// If the previously selected difficulty exists in the new song, keep it.
		// Otherwise, default to the first available difficulty.
		if (!song.difficulties.includes(selectedDifficulty)) {
			selectedDifficulty = song.difficulties[0];
		}
	} else {
		selectedDifficulty = "";
	}
}

function handleSongConfirm(song: SongWheelItem) {
	const diff = selectedDifficulty || song.difficulties?.[0] || "Normal";
	goto(`/solo/play/${song.id}?difficulty=${encodeURIComponent(diff)}`);
}

function handleSearchChange(term: string) {
	searchTerm = term;
}
</script>

<svelte:head>
	<title>Solo - Song Select - MUG</title>
</svelte:head>

<!-- Hidden Audio Element for Preview -->
<audio bind:this={audioElement} loop />

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
		<div class="flex-1 flex w-full h-full relative z-10 pb-24">
			<!-- Left Panel: Song Details -->
			<div class="w-[40%] h-full flex flex-col">
				{#if selectedSong}
					<SongDetailPanel
						song={selectedSong}
						{selectedDifficulty}
						onDifficultySelect={(diff) => (selectedDifficulty = diff)}
					/>
				{:else}
					<div class="flex-1 flex items-center justify-center">
						<p class="text-xl text-gray-500">Select a song to see details</p>
					</div>
				{/if}
			</div>

			<!-- Right Panel: Song Wheel -->
			<div class="w-[60%] h-full flex flex-col">
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
		</div>

		<BottomBar>
			<button
				onclick={() => goto("/home")}
				class="px-6 py-3 rounded-lg font-bold text-red-400 hover:bg-red-900/30 hover:text-red-200 transition"
			>
				BACK
			</button>

			<div class="flex gap-4">
				<button
					class="px-6 py-3 rounded-lg font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition"
				>
					MODS
				</button>
				<button
					class="px-6 py-3 rounded-lg font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition"
				>
					OPTIONS
				</button>
			</div>

			<button
				onclick={() => {
					if (selectedSong) {
						// Create a SongWheelItem compatible object
						const songItem: SongWheelItem = {
							id: selectedSong.id,
							title: selectedSong.title,
							artist: selectedSong.artist,
							imageUrl: selectedSong.imageUrl,
							difficulties: selectedSong.difficulties
						};
						handleSongConfirm(songItem);
					}
				}}
				class="px-12 py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-black text-xl tracking-widest text-white shadow-lg shadow-pink-500/20 hover:scale-105 hover:shadow-pink-500/40 transition active:scale-95 disabled:opacity-50 disabled:grayscale"
				disabled={!selectedSong}
			>
				PLAY
			</button>
		</BottomBar>
	{/if}
</div>