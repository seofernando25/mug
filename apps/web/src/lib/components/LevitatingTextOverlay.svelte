<script lang="ts">
	const {
		songTimeMs = 0,
		durationMs = 0,
		bpm = 120,
		title = '',
		artist = '',
		difficultyName = ''
	} = $props();

	function formatTime(ms: number): string {
		const totalSeconds = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}

	const timeRemainingMs = $derived(Math.max(0, durationMs - songTimeMs));

	const beatDurationMs = $derived(60000 / bpm / 0.5);
	const beatProgress = $derived((songTimeMs % beatDurationMs) / beatDurationMs);
	const titleScale = $derived(1 + 0.01 * Math.sin(beatProgress * Math.PI));
</script>

<!-- Top Left: Song Info -->
<div class="fixed top-0 left-0 z-50 pointer-events-none select-none">
	<div
		class="px-8 py-4 rounded-br-3xl bg-black/60 backdrop-blur-xl border-r-4 border-b-4 border-purple-500/50 shadow-[0_0_30px_rgba(147,51,234,0.2)] flex flex-col gap-1"
	>
		<div class="flex flex-col">
			<h1
				class="text-2xl font-black italic tracking-tighter text-white drop-shadow-md leading-tight"
				style="transform: scale({titleScale}); transform-origin: left center;"
			>
				{title}
			</h1>
			<p class="text-sm font-bold text-gray-400 italic">
				{artist}
			</p>
		</div>

		{#if difficultyName}
			<div class="mt-2 flex items-center gap-2">
				<span
					class="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-[10px] font-black uppercase tracking-widest text-purple-300"
				>
					{difficultyName}
				</span>
				<span class="text-[10px] font-bold text-gray-500 tabular-nums">
					{bpm} BPM
				</span>
			</div>
		{/if}
	</div>
</div>

<!-- Bottom: Progress & Timers -->
<div class="fixed bottom-0 left-0 w-full z-50 pointer-events-none select-none px-6 pb-4">
	<div class="flex flex-col gap-2">
		<!-- Timers -->
		<div class="flex justify-between items-end px-1">
			<div class="flex flex-col">
				<span
					class="text-2xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-lg"
				>
					{formatTime(songTimeMs)}
				</span>
			</div>

			<div class="flex flex-col items-end">
				<span
					class="text-[8px] font-black uppercase tracking-widest text-pink-400/50 leading-none mb-1"
					>REMAINING</span
				>
				<span
					class="text-2xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-lg"
				>
					-{formatTime(timeRemainingMs)}
				</span>
			</div>
		</div>

		<!-- Progress Bar Container -->
		<div
			class="w-full h-1.5 bg-gray-900/80 rounded-full overflow-hidden backdrop-blur-sm border border-white/5 relative"
		>
			<!-- Glow effect -->
			<div
				class="absolute inset-y-0 left-0 bg-cyan-400/20 blur-sm transition-all duration-100 ease-linear"
				style="width: {Math.min(100, (songTimeMs / durationMs) * 100)}%"
			></div>
			<!-- Main bar -->
			<div
				class="h-full bg-gradient-to-r from-purple-600 via-cyan-400 to-pink-500 transition-all duration-100 ease-linear relative z-10"
				style="width: {Math.min(100, (songTimeMs / durationMs) * 100)}%"
			></div>
		</div>
	</div>
</div>

<style lang="postcss">
	:global(.levitate) {
		animation: levitate 2s infinite;
		animation-timing-function: ease-in-out;
		animation-direction: alternate;
		display: inline-block;
	}

	@keyframes levitate {
		0% {
			transform: translateY(-2px);
		}
		100% {
			transform: translateY(2px);
		}
	}
</style>
