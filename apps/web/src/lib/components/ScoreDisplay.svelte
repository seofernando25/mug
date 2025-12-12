<script lang="ts">
	let { score = 0 } = $props();

	let scoreDisplayElement = $state<HTMLParagraphElement | undefined>(undefined);

	// Scale based on score magnitude (can be adjusted)
	let currentScoreMagnitudeScale = $derived(1 + Math.log10(Math.max(1, score / 1000 + 1)) * 0.1); // Adjusted for typical score values

	const POP_ANIMATION_DURATION = 300; // ms - match this with CSS animation duration

	// Constants for randomization
	const MAX_POP_TRANSLATE = 3; // px
	const MAX_POP_ROTATE = 3; // degrees
	const MIN_POP_EXPLOSION_SCALE_FACTOR = 1.1;
	const MAX_POP_EXPLOSION_SCALE_FACTOR = 1.3;

	$effect(() => {
		if (scoreDisplayElement) {
			scoreDisplayElement.style.setProperty(
				'--current-score-magnitude-scale',
				String(currentScoreMagnitudeScale)
			);

			if (score > 0) {
				// Trigger effect if score is not zero, or on any change if preferred
				const randomTX = (Math.random() - 0.5) * 2 * MAX_POP_TRANSLATE;
				const randomTY = (Math.random() - 0.5) * 2 * MAX_POP_TRANSLATE;
				const randomRot = (Math.random() - 0.5) * 2 * MAX_POP_ROTATE;
				const randomScaleFactor =
					MIN_POP_EXPLOSION_SCALE_FACTOR +
					Math.random() * (MAX_POP_EXPLOSION_SCALE_FACTOR - MIN_POP_EXPLOSION_SCALE_FACTOR);

				scoreDisplayElement.style.setProperty('--pop-translate-x', `${randomTX}px`);
				scoreDisplayElement.style.setProperty('--pop-translate-y', `${randomTY}px`);
				scoreDisplayElement.style.setProperty('--pop-rotate', `${randomRot}deg`);
				scoreDisplayElement.style.setProperty('--pop-explosion-scale', String(randomScaleFactor));

				scoreDisplayElement.classList.remove('score-pop-eff');
				void scoreDisplayElement.offsetWidth; // Force reflow
				scoreDisplayElement.classList.add('score-pop-eff');

				const timeoutId = setTimeout(() => {
					if (scoreDisplayElement) {
						scoreDisplayElement.classList.remove('score-pop-eff');
					}
				}, POP_ANIMATION_DURATION);

				return () => clearTimeout(timeoutId);
			} else {
				scoreDisplayElement.classList.remove('score-pop-eff');
			}
		}
	});
</script>

{#if score !== undefined}
	<!-- Display even if score is 0 -->
	{#key score}
		<div class="score-display-container">
			<p bind:this={scoreDisplayElement} class="score-display">
				<span class="score-label">SCORE</span>
				<span class="score-value">{score}</span>
			</p>
		</div>
	{/key}
{/if}

<style lang="postcss">
	.score-display-container {
		position: fixed; /* Changed from absolute for broader applicability */
		top: 2rem; /* Adjusted position */
		right: 2rem;
		z-index: 20;
		text-align: right;
		pointer-events: none;
	}

	.score-display {
		font-size: 2.2rem; /* Slightly smaller than combo */
		color: #ffd700; /* Gold color */
		text-shadow: /* Adjusted shadow for gold text */
			0 0 3px #fff,
			0 0 6px #ffd700,
			0 0 9px #ffae00,
			0 0 12px #ff8c00;
		font-family: 'Arial Black', Gadget, sans-serif; /* Example of a punchier font */
		font-weight: bold;
		transform-origin: center center;
		transform: scale(var(--current-score-magnitude-scale, 1)) translate(0px, 0px) rotate(0deg);
		transition: transform 0.2s ease-out;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.score-label {
		font-size: 0.8rem;
		color: #eee; /* Lighter color for the label */
		text-shadow: 0 0 2px #000;
		margin-bottom: -0.5rem; /* Pull value closer */
	}

	.score-value {
		padding-top: 0.5rem;
		line-height: 1;
	}

	:global(.score-pop-eff) {
		animation: scorePopKeyframes var(--pop-duration, 0.3s) ease-out; /* Duration matches POP_ANIMATION_DURATION */
	}

	@keyframes scorePopKeyframes {
		0% {
			transform: scale(var(--current-score-magnitude-scale, 1)) translate(0px, 0px) rotate(0deg);
			opacity: 0.8;
		}
		40% {
			transform: scale(
					calc(var(--current-score-magnitude-scale, 1) * var(--pop-explosion-scale, 1.15))
				)
				translate(var(--pop-translate-x, 0px), var(--pop-translate-y, 0px))
				rotate(var(--pop-rotate, 0deg));
			opacity: 1;
		}
		100% {
			transform: scale(var(--current-score-magnitude-scale, 1)) translate(0px, 0px) rotate(0deg);
			opacity: 1;
		}
	}
</style>
