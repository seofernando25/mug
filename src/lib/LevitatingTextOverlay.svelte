<script lang="ts">
	import type { Action } from 'svelte/action';

	// Props for the component - Svelte 5 $props without generic argument
	let { 
		title = '' as string,
		artist = '' as string,
		difficultyName = '' as string
	} = $props();

	// Svelte Action for levitating text effect
	const levitateText: Action<HTMLElement> = (node) => {
		const originalText = node.textContent || '';
		const randomOffset = Math.random() * 100;
		if (originalText) {
			node.innerHTML = originalText
				.split('')
				.map((char, i) =>
					char === ' ' ? ' ' : // Preserve spaces
						`<span class="levitate" style="animation-delay: ${-i * 150 + randomOffset}ms">${char}</span>`
				)
				.join('');
		}

		return {
			destroy() {
				// Optional: Restore original text content if needed
			}
		};
	};
</script>


<!-- HTML Overlay for Title and Difficulty with Levitate Effect -->
<div class="fixed top-4 left-4 z-10 p-3 rounded-md bg-black bg-opacity-30 text-overlay-container">
	{#if title || artist}
		<h1 use:levitateText class="title-text text-2xl font-bold mb-1">
			{title}{artist ? ` - ${artist}` : ''}
		</h1>
	{/if}
	{#if difficultyName}
		<p use:levitateText class="difficulty-text text-sm">
			Difficulty: <span class="font-mono text-purple-300">{difficultyName}</span>
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