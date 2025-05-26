<script lang="ts">
	let { countdownValue }: { countdownValue: number } = $props();
</script>

<div class="overlay-container countdown-overlay">
	<h1 class="countdown-text">{countdownValue}</h1>
</div>

<style>
	.overlay-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: rgba(0, 0, 0, 0.7);
		z-index: 100; /* Ensure it's above the game canvas */
		color: white;
	}

	.countdown-text {
		font-size: 10rem;
		font-weight: bold;
		text-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
		animation: pulse 1s infinite alternate;
	}

	@keyframes pulse {
		from {
			transform: scale(1);
			opacity: 0.8;
		}
		to {
			transform: scale(1.1);
			opacity: 1;
		}
	}
</style>
