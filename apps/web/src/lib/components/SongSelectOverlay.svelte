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
	onSelect: (data: { song: SongWheelItem; difficulty: string }) => void;
	songs: SongWheelItem[];
}>();

// Local State
let searchTerm = $state("");
let selectedId = $state<string | null>(null);
let selectedDifficulty = $state<string>("");
let audioElement = $state<HTMLAudioElement | undefined>();

// Derived
const activeSong = $derived(
	songs.find((s: SongWheelItem) => s.id === selectedId) || songs[0],
);

// Initialize selected song when songs load
$effect(() => {
	if (songs.length > 0 && !selectedId) {
		selectedId = songs[0].id;
	}
});

// Initialize difficulty when active song changes
$effect(() => {
	if (activeSong?.difficulties && activeSong.difficulties.length > 0) {
		if (!selectedDifficulty || !activeSong.difficulties.includes(selectedDifficulty)) {
			selectedDifficulty = activeSong.difficulties[0];
		}
	} else {
		selectedDifficulty = "";
	}
});

// Handle Audio Preview
$effect(() => {
	// If overlay is closed or no song selected, stop audio
	if (!isOpen || !activeSong || !audioElement) {
		if (audioElement) {
			audioElement.pause();
			audioElement.currentTime = 0;
		}
		return;
	}

	// Play preview
	const url = activeSong.audioUrl;
	if (url) {
		audioElement.src = url;
		const startMs = activeSong.previewStartTime ?? 0;
		audioElement.currentTime = startMs > 0 ? startMs / 1000 : 0;
		audioElement.volume = 0;

		const playPromise = audioElement.play();
		if (playPromise !== undefined) {
			playPromise
				.then(() => {
					// Fade in
					let vol = 0;
					const fadeInterval = setInterval(() => {
						if (!audioElement || audioElement.paused) {
							clearInterval(fadeInterval);
							return;
						}
						vol += 0.05;
						if (vol >= 0.3) {
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
	} else {
		audioElement.pause();
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
	// Ensure we have the correct difficulty for the confirmed song
	// (In case of race conditions or double click on non-active song)
	let diff = selectedDifficulty;
	if (song.id !== activeSong?.id || !diff) {
		diff = song.difficulties?.[0] || "Normal";
	}

	onSelect({ song, difficulty: diff });
	onClose();
}

function handleSearchChange(term: string) {
	searchTerm = term;
}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Hidden Audio Element -->
<audio bind:this={audioElement} loop></audio>

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
									<button
										class="w-full text-left px-3 py-2 rounded text-sm transition-colors flex justify-between items-center
										{selectedDifficulty === difficulty
											? 'bg-purple-600 text-white font-bold shadow-md'
											: 'bg-gray-800/50 text-gray-200 hover:bg-gray-700'}"
										onclick={() => (selectedDifficulty = difficulty)}
									>
										<span>{difficulty}</span>
										{#if selectedDifficulty === difficulty}
											<span class="text-xs bg-white/20 px-2 py-0.5 rounded text-white">SELECTED</span>
										{/if}
									</button>
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
