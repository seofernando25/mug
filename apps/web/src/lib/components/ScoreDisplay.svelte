<script lang="ts">
	const { score = 0 } = $props();

	let scoreDisplayElement = $state<HTMLParagraphElement | undefined>(undefined);

	// Scale based on score magnitude
	const currentScoreMagnitudeScale = $derived(1 + Math.log10(Math.max(1, score / 1000 + 1)) * 0.05);

	const POP_ANIMATION_DURATION = 300;

	$effect(() => {
		if (scoreDisplayElement) {
			scoreDisplayElement.style.setProperty(
				'--current-score-magnitude-scale',
				String(currentScoreMagnitudeScale)
			);

			if (score > 0) {
				const randomTX = (Math.random() - 0.5) * 4;
				const randomScaleFactor = 1.1 + Math.random() * 0.1;

				scoreDisplayElement.style.setProperty('--pop-translate-x', `${randomTX}px`);
				scoreDisplayElement.style.setProperty('--pop-explosion-scale', String(randomScaleFactor));

				scoreDisplayElement.classList.remove('score-pop-eff');
				void scoreDisplayElement.offsetWidth;
				scoreDisplayElement.classList.add('score-pop-eff');

				const timeoutId = setTimeout(() => {
					if (scoreDisplayElement) {
						scoreDisplayElement.classList.remove('score-pop-eff');
					}
				}, POP_ANIMATION_DURATION);

				return () => clearTimeout(timeoutId);
			}
		}
	});
</script>

<div class="score-display-container">
	<div
		class="px-6 py-2 rounded-bl-3xl bg-black/60 backdrop-blur-xl border-l-4 border-b-4 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
	>
		<div bind:this={scoreDisplayElement} class="flex flex-col items-end">
			<span
				class="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/70 leading-none mb-1"
				>SCORE</span
			>
			<span
				class="text-4xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
			>
				{score.toLocaleString()}
			</span>
		</div>
	</div>
</div>

<style lang="postcss">
	.score-display-container {
		position: fixed;
		top: 0;
		right: 0;
		z-index: 50;
		pointer-events: none;
	}

	:global(.score-pop-eff) {
		animation: scorePopKeyframes 0.3s ease-out;
	}

	@keyframes scorePopKeyframes {
		0% {
			transform: scale(var(--current-score-magnitude-scale, 1));
		}
		40% {
			transform: scale(
					calc(var(--current-score-magnitude-scale, 1) * var(--pop-explosion-scale, 1.1))
				)
				translateX(var(--pop-translate-x, 0px));
			filter: brightness(1.5);
		}
		100% {
			transform: scale(var(--current-score-magnitude-scale, 1));
		}
	}
</style>
