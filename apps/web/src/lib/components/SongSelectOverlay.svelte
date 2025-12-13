<script lang="ts">
import { fade, fly } from "svelte/transition";
import SongWheel, { type SongWheelItem } from "./song-select/SongWheel.svelte";

// Props using Svelte 5 Runes
const {
	isOpen = false,
	onClose,
	onSelect,
	songs = [],
} = $props<{
	isOpen: boolean;
	onClose: () => void;
	onSelect: (song: SongWheelItem) => void;
	songs: SongWheelItem[];
}>();

// Local State
let searchTerm = $state("");
let selectedId = $state<string | null>(null);

// Derived
const activeSong = $derived(
	songs.find((s) => s.id === selectedId) || songs[0],
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

function handleSongSelect(song: SongWheelItem) {
	selectedId = song.id;
}

function handleSongConfirm(song: SongWheelItem) {
	onSelect(song);
	onClose();
}

function handleSearchChange(term: string) {
	searchTerm = term;
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex overflow-hidden bg-gray-900 text-white font-sans select-none"
		transition:fade={{ duration: 200 }}
	>
		<!-- Dynamic Background -->
		{#key activeSong?.id}
			<div
				class="absolute inset-0 bg-cover bg-center opacity-30 blur-sm transition-all duration-700 transform scale-105"
				style="background-image: url({activeSong?.imageUrl});"
				transition:fade={{ duration: 500 }}
			></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent"></div>
		{/key}

		<!-- Left Panel: Song Details -->
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

		<!-- Right Panel: Song Wheel -->
		<div class="relative z-10 w-[60%] h-full flex flex-col">
			<SongWheel
				{songs}
				selectedSongId={selectedId}
				onSelect={handleSongSelect}
				onConfirm={handleSongConfirm}
				{searchTerm}
				onSearchChange={handleSearchChange}
				showSearch={true}
			/>
		</div>
	</div>
{/if}
