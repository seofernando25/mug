<script lang="ts">
	import { levitateText } from '$lib/actions/levitateText';

	let { songTimeMs = 0, bpm = 120, title = '', artist = '', difficultyName = '' } = $props();

	let beatDurationMs = $derived(60000 / bpm / 0.5);
	let beatProgress = $derived((songTimeMs % beatDurationMs) / beatDurationMs);
	let titleScale = $derived(1 + 0.02 * Math.sin(beatProgress * Math.PI));
</script>

<!-- HTML Overlay for Title and Difficulty with Levitate Effect -->
<div class="fixed top-4 left-4 z-10 p-3 rounded-md bg-black bg-opacity-30 text-overlay-container">
	{#if title || artist}
		<h1
			use:levitateText
			class="title-text text-2xl font-bold mb-1"
			style="transform: scale({titleScale});"
		>
			{title}{artist ? ` - ${artist}` : ''}
		</h1>
	{/if}
	{#if difficultyName}
		<p use:levitateText class="difficulty-text text-sm">
			Difficulty: <span class="font-mono text-purple-300">{difficultyName}</span>
		</p>
	{/if}
	{#if songTimeMs !== undefined}
		<p class="time-text text-lg text-gray-400 mt-1">
			Time: <span class="font-mono text-green-400">{songTimeMs.toFixed(0)} ms</span>
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
