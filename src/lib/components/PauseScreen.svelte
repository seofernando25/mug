<!-- Placeholder for PauseScreen component -->
<script lang="ts">
	let {
		onResume = () => {},
		onRetry = () => {},
		onExit = () => {}
	}: {
		onResume?: () => void;
		onRetry?: () => void;
		onExit?: () => void;
	} = $props();
</script>

<div class="overlay-container pause-overlay">
	<div class="pause-box">
		<h2 class="pause-title">Paused</h2>
		<div class="pause-buttons">
			<button onclick={onResume} class="pause-button resume-button">Resume</button>
			<button onclick={onRetry} class="pause-button retry-button">Retry</button>
			<button onclick={onExit} class="pause-button exit-button">Exit to Menu</button>
		</div>
	</div>
</div>

<style>
	.overlay-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: rgba(0, 0, 0, 0.85); /* Darker overlay */
		z-index: 1000;
		color: white;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.pause-box {
		background-color: rgba(30, 30, 50, 0.95); /* Slightly different from summary */
		padding: 30px 40px;
		border-radius: 15px;
		text-align: center;
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(120, 120, 220, 0.7);
		min-width: 300px;
	}

	.pause-title {
		font-size: 2.5rem;
		margin-bottom: 25px;
		color: #60a5fa; /* A blueish accent for pause */
	}

	.pause-buttons {
		display: flex;
		flex-direction: column; /* Stack buttons vertically */
		gap: 15px; /* Space between buttons */
		margin-top: 20px;
	}

	.pause-button {
		display: block; /* Make buttons take full width of their container (centered by pause-box) */
		width: 100%;
		padding: 12px 20px;
		color: white;
		text-decoration: none;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: bold;
		transition:
			background-color 0.3s ease,
			transform 0.2s ease;
		border: none;
		cursor: pointer;
	}

	.resume-button {
		background-color: #34d399; /* Green for resume */
	}
	.resume-button:hover {
		background-color: #6ee7b7;
		transform: translateY(-2px);
	}

	.retry-button {
		background-color: #f59e0b; /* Amber for retry */
	}
	.retry-button:hover {
		background-color: #fbbf24;
		transform: translateY(-2px);
	}

	.exit-button {
		background-color: #ef4444; /* Red for exit */
	}
	.exit-button:hover {
		background-color: #f87171;
		transform: translateY(-2px);
	}
</style>
