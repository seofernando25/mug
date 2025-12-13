<script lang="ts">
import { fly } from "svelte/transition";

export interface SongWheelItem {
	id: string;
	title: string;
	artist: string;
	imageUrl?: string | null;
	difficulties?: string[];
}

interface Props {
	songs: SongWheelItem[];
	selectedSongId: string | null;
	onSelect: (song: SongWheelItem) => void;
	onConfirm?: (song: SongWheelItem) => void;
	searchTerm?: string;
	onSearchChange?: (term: string) => void;
	showSearch?: boolean;
}

const {
	songs,
	selectedSongId,
	onSelect,
	onConfirm,
	searchTerm = "",
	onSearchChange,
	showSearch = true,
}: Props = $props();

let internalSearchTerm = $state("");

$effect(() => {
    if (!onSearchChange) {
        internalSearchTerm = searchTerm;
    }
});

const activeSearchTerm = $derived(onSearchChange ? searchTerm : internalSearchTerm);

const filteredSongs = $derived(
	songs.filter(
		(s) =>
			s.title.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
			s.artist.toLowerCase().includes(activeSearchTerm.toLowerCase()),
	),
);

function handleSearchInput(e: Event) {
	const value = (e.target as HTMLInputElement).value;
	if (onSearchChange) {
		onSearchChange(value);
	} else {
		internalSearchTerm = value;
	}
}

function handleSongClick(song: SongWheelItem) {
	if (selectedSongId === song.id) {
		// Second click - confirm selection
		onConfirm?.(song);
	} else {
		// First click - select
		onSelect(song);
	}
}
</script>

<div class="song-wheel h-full flex flex-col">
	{#if showSearch}
		<!-- Search Header -->
		<div class="flex items-center justify-end px-8 py-4 gap-4">
			<div class="flex items-end space-x-1 mr-8">
				<button class="px-6 py-2 bg-pink-600 text-white font-bold rounded-t-lg transform hover:-translate-y-1 transition shadow-lg shadow-pink-500/20">
					All Songs
				</button>
			</div>

			<div class="relative group w-96">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<svg class="h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				</div>
				<input
					value={activeSearchTerm}
					oninput={handleSearchInput}
					type="text"
					class="block w-full pl-10 pr-3 py-3 border-none rounded-lg leading-5 bg-gray-900/80 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 sm:text-sm backdrop-blur transition"
					placeholder="Type to search..."
				>
			</div>
		</div>
	{/if}

	<!-- Song List (Wheel) -->
	<div class="flex-1 overflow-y-auto overflow-x-hidden py-4 pr-0 scrollbar-hide">
		<div class="flex flex-col items-end gap-3 min-h-min">
			{#each filteredSongs as song (song.id)}
				{@const isSelected = selectedSongId === song.id}

				<button
					onclick={() => handleSongClick(song)}
					class="relative w-[85%] transition-all duration-200 ease-out group text-left
						   {isSelected ? 'translate-x-[-20px] scale-105 z-20' : 'hover:translate-x-[-10px] opacity-80 hover:opacity-100'}"
					in:fly={{ x: 50, duration: 300, delay: 50 }}
				>
					<div class="h-24 w-full flex overflow-hidden rounded-l-xl border-r-4 shadow-xl backdrop-blur-md
							  {isSelected ? 'bg-gray-800/90 border-pink-500 ring-1 ring-pink-500/50' : 'bg-gray-900/60 border-blue-500/50 hover:border-blue-400'}"
					>
						<div class="w-32 h-full bg-cover bg-center shrink-0" style="background-image: url({song.imageUrl})">
							<div class="w-full h-full bg-black/30 group-hover:bg-transparent transition"></div>
						</div>

						<div class="flex-1 p-3 flex flex-col justify-center relative overflow-hidden">
							<span class="absolute right-2 top-0 text-2xl font-black text-white/5 pointer-events-none italic select-none uppercase tracking-wider">
								{song.difficulties?.length || 0}
							</span>
							<h3 class="text-xl font-bold truncate text-white drop-shadow-md pr-12">
								{song.title}
							</h3>
							<p class="text-sm text-gray-300 font-medium truncate">{song.artist}</p>

							<div class="mt-1 flex items-center gap-2">
								{#if isSelected}
									<span class="text-pink-400 text-xs font-bold uppercase tracking-wider animate-pulse">
										Click to play
									</span>
								{/if}
								{#if song.difficulties && song.difficulties.length > 0}
									<span class="text-xs text-gray-400">
										{song.difficulties.length} {song.difficulties.length === 1 ? 'difficulty' : 'difficulties'}
									</span>
								{/if}
							</div>
						</div>
					</div>
				</button>
			{/each}
			{#if filteredSongs.length === 0}
				<div class="w-full text-center py-20 text-gray-500 italic">
					{#if activeSearchTerm}
						No songs found matching "{activeSearchTerm}"
					{:else}
						No songs available
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Hide scrollbar for cleaner look */
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>

