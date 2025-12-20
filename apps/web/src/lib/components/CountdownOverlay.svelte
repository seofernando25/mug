<script lang="ts">
const { countdownValue }: { countdownValue: number } = $props();
</script>

<div class="overlay-container countdown-overlay">
	<div class="center-content">
		<h1 class="countdown-text">{countdownValue}</h1>
		<p class="ready-text">GET READY</p>
	</div>
	
	<!-- Progress Bar at bottom -->
	<div class="progress-bar-container">
		<div class="progress-bar" style="width: {(countdownValue / 3) * 100}%"></div>
	</div>
</div>

<style>
	.overlay-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-col: column;
		justify-content: center;
		align-items: center;
		background-color: transparent; /* Removed dark background */
		z-index: 100;
		color: white;
		pointer-events: none; /* Allow clicks to pass through if needed */
	}

	.center-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-shadow: 0 4px 20px rgba(0,0,0,0.8);
	}

	.countdown-text {
		font-size: 12rem;
		font-weight: 900;
		line-height: 1;
		opacity: 0.3; /* Transparent so notes are visible behind */
		animation: pulse 1s infinite alternate;
	}

	.ready-text {
		font-size: 2rem;
		font-weight: bold;
		letter-spacing: 0.5em;
		color: #22d3ee; /* Cyan-400 */
		opacity: 0.8;
	}

	.progress-bar-container {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 8px;
		background-color: rgba(255, 255, 255, 0.1);
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, #9333ea, #22d3ee); /* Purple to Cyan */
		transition: width 1s linear;
	}

	@keyframes pulse {
		from {
			transform: scale(1);
			opacity: 0.3;
		}
		to {
			transform: scale(1.1);
			opacity: 0.5;
		}
	}
</style>
