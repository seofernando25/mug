<script lang="ts">
import { fade, fly } from "svelte/transition";
import { cubicOut } from "svelte/easing";

interface SongItem {
	id: string;
	title: string;
	artist: string;
	imageUrl?: string;
	difficulties?: string[];
}

// Props using Svelte 5 Runes
let {
	isOpen = false,
	onClose,
	onSelect,
	songs = [],
} = $props<{
	isOpen: boolean;
	onClose: () => void;
	onSelect: (song: SongItem) => void;
	songs: SongItem[];
}>();

// Local State
let searchTerm = $state("");
let selectedId = $state<string | null>(null);
let sortBy = $state<"title" | "difficulty">("title");

// Derived
let filteredSongs = $derived(
	songs.filter(
		(s: SongItem) =>
			s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			s.artist.toLowerCase().includes(searchTerm.toLowerCase()),
	),
);

let activeSong = $derived(
	songs.find((s: SongItem) => s.id === selectedId) || songs[0],
);

// Initialize selected song when songs load
$effect(() => {
	if (songs.length > 0 && !selectedId) {
		selectedId = songs[0].id;
	}
});

function handleKeydown(e: KeyboardEvent) {
	if (!isOpen) return;
	if (e.key === "Escape") onClose();
}

function selectSong(song: SongItem) {
	if (selectedId === song.id) {
		// Confirm selection if clicked twice
		onSelect(song);
		onClose();
	} else {
		selectedId = song.id;
	}
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex overflow-hidden bg-gray-900 text-white font-sans select-none"
		transition:fade={{ duration: 200 }}
	>
		{#key activeSong?.id}
			<div
				class="absolute inset-0 bg-cover bg-center opacity-30 blur-sm transition-all duration-700 transform scale-105"
				style="background-image: url({activeSong?.imageUrl});"
				transition:fade={{ duration: 500 }}
			></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent"></div>
		{/key}

		<div class="relative z-10 w-[40%] h-full flex flex-col p-12 pt-24 space-y-8" in:fly={{ x: -50, duration: 400 }}>

			<div>
				<h1 class="text-5xl font-black tracking-tight italic text-white drop-shadow-lg leading-tight">
					{activeSong?.title}
				</h1>
				<p class="text-2xl text-cyan-300 font-light mt-1">{activeSong?.artist}</p>

				<div class="flex items-center gap-4 mt-4 text-sm font-bold text-gray-400">
					{#if activeSong?.difficulties && activeSong.difficulties.length > 0}
						<span class="bg-gray-800/80 px-3 py-1 rounded border border-gray-600">
							{activeSong.difficulties.length} Difficulties
						</span>
					{/if}
					<span>Mapped by Community</span>
				</div>
			</div>

			<div class="flex-1 bg-black/40 rounded-xl border border-white/10 overflow-hidden flex flex-col backdrop-blur-md">
				<div class="bg-black/50 p-4 border-b border-white/10 flex justify-between items-center">
					<span class="font-bold text-lg tracking-widest text-gray-200">CHART INFO</span>
					<span class="text-xs text-gray-500">DETAILS</span>
				</div>

				<div class="overflow-y-auto p-4 space-y-4">
					{#if activeSong?.difficulties && activeSong.difficulties.length > 0}
						<div>
							<h4 class="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Available Difficulties</h4>
							<div class="space-y-1">
								{#each activeSong.difficulties as difficulty}
									<div class="bg-gray-800/50 px-3 py-2 rounded text-sm text-gray-200">
										{difficulty}
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="h-32 flex items-center justify-center text-gray-500 italic">
							No difficulties available
						</div>
					{/if}
				</div>
			</div>

			<button onclick={onClose} class="self-start text-gray-500 hover:text-white transition flex items-center gap-2">
				<span>← BACK</span>
			</button>
		</div>

		<div class="relative z-10 w-[60%] h-full flex flex-col">

			<div class="h-24 flex items-center justify-end px-8 gap-4 bg-gradient-to-b from-black/80 to-transparent">
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
						bind:value={searchTerm}
						type="text"
						class="block w-full pl-10 pr-3 py-3 border-none rounded-lg leading-5 bg-gray-900/80 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 sm:text-sm backdrop-blur transition"
						placeholder="Type to search..."
					>
				</div>
			</div>

			<div class="flex-1 overflow-y-auto overflow-x-hidden py-4 pr-0 scrollbar-hide">
				<div class="flex flex-col items-end gap-3 min-h-min">
					{#each filteredSongs as song (song.id)}
						{@const isSelected = selectedId === song.id}

						<button
							onclick={() => selectSong(song)}
							class="relative w-[85%] transition-all duration-200 ease-out group text-left
								   {isSelected ? 'translate-x-[-20px] scale-105 z-20' : 'hover:translate-x-[-10px] opacity-80 hover:opacity-100'}"
						>
							<div class="h-24 w-full flex overflow-hidden rounded-l-xl border-r-4 shadow-xl backdrop-blur-md
									  {isSelected ? 'bg-gray-800/90 border-pink-500 ring-1 ring-pink-500/50' : 'bg-gray-900/60 border-blue-500/50 hover:border-blue-400'}"
							>
								<div class="w-32 h-full bg-cover bg-center" style="background-image: url({song.imageUrl})">
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
												Selected
											</span>
										{/if}
										{#if song.difficulties && song.difficulties.length > 0}
											<span class="text-xs text-gray-400">
												{song.difficulties.length} difficulties
											</span>
										{/if}
									</div>
								</div>
							</div>
						</button>
					{/each}
					{#if filteredSongs.length === 0}
						<div class="w-full text-center py-20 text-gray-500 italic">
							{#if searchTerm}
								No songs found matching "{searchTerm}"
							{:else}
								No songs available
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

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