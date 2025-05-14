<script lang="ts">
	let { combo = 0 as number } = $props();

	let comboValueElement = $state<HTMLElement | undefined>(undefined);
	let prevCombo = $state(combo);

	$effect(() => {
		if (combo > prevCombo && combo > 0 && comboValueElement) {
			comboValueElement.classList.add('combo-bounce-eff'); // Use a unique class name
			const animationTimeout = setTimeout(() => {
				if (comboValueElement) {
					// Check if element still exists
					comboValueElement.classList.remove('combo-bounce-eff');
				}
			}, 300); // Corresponds to animation duration

			// Svelte 5 specific cleanup for $effect
			return () => clearTimeout(animationTimeout);
		}
		// Update prevCombo only if the new combo is different, to correctly handle combo resets followed by a new combo of 1
		if (combo !== prevCombo) {
			prevCombo = combo;
		}
	});
</script>

{#if combo > 0}
	<div class="combo-meter-container">
		<p class="combo-display">
			x<span bind:this={comboValueElement} class="combo-value">{combo}</span>
		</p>
	</div>
{/if}

<style lang="postcss">
	.combo-meter-container {
		position: absolute;
		top: 20%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20; /* Ensure it's above most other elements */
		text-align: center;
		pointer-events: none; /* Allow clicks to pass through if needed */
	}

	.combo-display {
		font-size: 3rem; /* Larger font size for combo */
		color: white;
		text-shadow:
			0 0 5px #fff,
			0 0 10px #fff,
			0 0 15px #ff00de,
			0 0 20px #ff00de,
			0 0 25px #ff00de,
			0 0 30px #ff00de,
			0 0 35px #ff00de; /* Neon glow effect */
		font-family: 'Arial', sans-serif; /* Or a more game-like font if you have one */
		font-weight: bold;
	}

	.combo-value {
		/* Inherits most styles from .combo-display */
		/* Specific color for the number can be redundant if parent has it, but good for clarity */
	}

	.combo-bounce-eff {
		/* Unique class name for the animation */
		animation: comboBounceAnimation 0.3s ease-out;
	}

	@keyframes comboBounceAnimation {
		/* Unique animation name */
		0% {
			transform: scale(1);
			opacity: 0.8;
		}
		50% {
			transform: scale(1.6); /* Slightly larger bounce */
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
