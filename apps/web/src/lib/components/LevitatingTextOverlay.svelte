<script lang="ts">
import { levitateText } from "$lib/actions/levitateText";

const {
	songTimeMs = 0,
	bpm = 120,
	title = "",
	artist = "",
	difficultyName = "",
} = $props();

const beatDurationMs = $derived(60000 / bpm / 0.5);
const beatProgress = $derived((songTimeMs % beatDurationMs) / beatDurationMs);
const titleScale = $derived(1 + 0.02 * Math.sin(beatProgress * Math.PI));
</script>

<!-- HTML Overlay for Title and Difficulty with Levitate Effect -->
<div class="fixed top-4 left-4 z-10 p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg text-overlay-container">
	{#if title || artist}
		<h1
			use:levitateText
			class="title-text text-2xl font-bold mb-1 text-white drop-shadow-md"
			style="transform: scale({titleScale});"
		>
			{title}{artist ? ` - ${artist}` : ''}
		</h1>
	{/if}
	{#if difficultyName}
		<p use:levitateText class="difficulty-text text-sm font-medium text-gray-200">
			Difficulty: <span class="font-mono text-purple-300 font-bold">{difficultyName}</span>
		</p>
	{/if}
	{#if songTimeMs !== undefined}
		<p class="time-text text-lg text-gray-300 mt-2 font-mono">
			Time: <span class="text-green-400 font-bold">{songTimeMs.toFixed(0)}</span> <span class="text-xs text-gray-500">ms</span>
		</p>
	{/if}
</div>

<style lang="postcss">
	:global(.levitate) {
		animation: levitate 1s infinite;
		animation-timing-function: ease-in-out;
		animation-direction: alternate;
		display: inline-block;
	}

	@keyframes levitate {
		0% {
			transform: rotate(-3deg) translatey(-0.15rem);
		}
		100% {
			transform: rotate(3deg) translatey(0.15rem);
		}
	}
</style>
