<script lang="ts">
	// songTimeMs and bpm are no longer needed
	let { combo = 0 as number } = $props();

	let comboDisplayElement = $state<HTMLParagraphElement | undefined>(undefined);

	// New: Scale based on combo magnitude
	// Adjust the 0.15 factor to control how much the size increases with combo
	let currentComboMagnitudeScale = $derived(1 + Math.log10(Math.max(1, combo)) * 0.15);

	const SLING_ANIMATION_DURATION = 500; // ms - match this with CSS animation duration

	// Constants for randomization
	const MAX_SLING_TRANSLATE = 5; // px
	const MAX_SLING_ROTATE = 5; // degrees
	const MIN_SLING_EXPLOSION_SCALE_FACTOR = 1.4;
	const MAX_SLING_EXPLOSION_SCALE_FACTOR = 1.8;

	// Effect to trigger sling animation on combo change & update base combo scale
	$effect(() => {
		if (comboDisplayElement) {
			// Always update the base combo magnitude scale when combo changes
			comboDisplayElement.style.setProperty(
				'--current-combo-magnitude-scale',
				String(currentComboMagnitudeScale)
			);

			if (combo > 0) {
				// Generate random values for the sling
				const randomTX = (Math.random() - 0.5) * 2 * MAX_SLING_TRANSLATE;
				const randomTY = (Math.random() - 0.5) * 2 * MAX_SLING_TRANSLATE;
				const randomRot = (Math.random() - 0.5) * 2 * MAX_SLING_ROTATE;
				const randomScaleFactor =
					MIN_SLING_EXPLOSION_SCALE_FACTOR +
					Math.random() * (MAX_SLING_EXPLOSION_SCALE_FACTOR - MIN_SLING_EXPLOSION_SCALE_FACTOR);

				// Set CSS variables for the animation
				comboDisplayElement.style.setProperty('--sling-translate-x', `${randomTX}px`);
				comboDisplayElement.style.setProperty('--sling-translate-y', `${randomTY}px`);
				comboDisplayElement.style.setProperty('--sling-rotate', `${randomRot}deg`);
				comboDisplayElement.style.setProperty('--sling-explosion-scale', String(randomScaleFactor));

				// Trigger animation
				comboDisplayElement.classList.remove('combo-sling-eff');
				void comboDisplayElement.offsetWidth; // Force reflow
				comboDisplayElement.classList.add('combo-sling-eff');

				const timeoutId = setTimeout(() => {
					if (comboDisplayElement) {
						comboDisplayElement.classList.remove('combo-sling-eff');
					}
				}, SLING_ANIMATION_DURATION);

				return () => clearTimeout(timeoutId);
			} else {
				// Ensure sling class is removed if combo is 0
				comboDisplayElement.classList.remove('combo-sling-eff');
			}
		}
	});
</script>

{#if combo > 0}
	{#key combo}
		<div class="combo-meter-container">
			<p bind:this={comboDisplayElement} class="combo-display">
				x<span class="combo-value">{combo}</span>
			</p>
		</div>
	{/key}
{/if}

<style lang="postcss">
	.combo-meter-container {
		position: absolute;
		top: 20%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		text-align: center;
		pointer-events: none;
	}

	.combo-display {
		font-size: 3rem;
		color: white;
		text-shadow:
			0 0 5px #fff,
			0 0 10px #fff,
			0 0 15px #ff00de,
			0 0 20px #ff00de,
			0 0 25px #ff00de,
			0 0 30px #ff00de,
			0 0 35px #ff00de;
		font-weight: bold;
		transform-origin: center center;
		/* Default transform driven by combo-magnitude-scale CSS variable */
		transform: scale(var(--current-combo-magnitude-scale, 1)) translate(0px, 0px) rotate(0deg);
		/* Smooth transition for combo magnitude scale changes */
		/* Adjust timing for how quickly the base size adapts */
		transition: transform 0.2s ease-out;
	}

	/* Needs global so css is not auto removed */
	:global(.combo-sling-eff) {
		animation: comboSlingKeyframes 0.5s ease-out; /* Duration matches SLING_ANIMATION_DURATION */
	}

	@keyframes comboSlingKeyframes {
		0% {
			transform: scale(var(--current-combo-magnitude-scale, 1)) translate(0px, 0px) rotate(0deg);
			opacity: 0.7;
		}
		30% {
			transform: scale(
					calc(var(--current-combo-magnitude-scale, 1) * var(--sling-explosion-scale, 1.5))
				)
				translate(var(--sling-translate-x, 0px), var(--sling-translate-y, 0px))
				rotate(var(--sling-rotate, 0deg));
			opacity: 1;
		}
		70% {
			/* Recoil */
			transform: scale(calc(var(--current-combo-magnitude-scale, 1) * 0.95))
				translate(
					calc(var(--sling-translate-x, 0px) * -0.1),
					calc(var(--sling-translate-y, 0px) * -0.1)
				)
				rotate(calc(var(--sling-rotate, 0deg) * -0.1));
			opacity: 0.9;
		}
		100% {
			transform: scale(var(--current-combo-magnitude-scale, 1)) translate(0px, 0px) rotate(0deg);
			opacity: 1;
		}
	}
</style>
