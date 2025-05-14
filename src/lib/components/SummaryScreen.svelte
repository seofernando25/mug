<script lang="ts">
	let {
		score,
		maxCombo,
		songTitle = '',
		artist = '',
		difficultyName = '',
		onRetry = () => {},
		onExit = () => {}
	}: {
		score: number;
		maxCombo: number;
		songTitle?: string;
		artist?: string;
		difficultyName?: string;
		onRetry?: () => void;
		onExit?: () => void;
	} = $props();
</script>

<div class="overlay-container summary-overlay">
	<div class="summary-box">
		<h2 class="summary-title">{songTitle ? songTitle : 'Song Cleared!'}</h2>
		{#if artist}<p class="summary-artist">{artist}</p>{/if}
		{#if difficultyName}<p class="summary-difficulty">Difficulty: {difficultyName}</p>{/if}
		<p class="summary-stat">Final Score: <span class="stat-value">{score}</span></p>
		<p class="summary-stat">Max Combo: <span class="stat-value">{maxCombo}</span></p>
		<div class="summary-buttons">
			<button onclick={onRetry} class="summary-button retry-button">Retry</button>
			<button onclick={onExit} class="summary-button exit-button">Exit to Menu</button>
		</div>
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
		justify-content: center;
		align-items: center;
		background-color: rgba(0, 0, 0, 0.85);
		z-index: 100; /* Ensure it's above the game canvas */
		color: white;
		animation: fadeIn 0.5s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.summary-box {
		background-color: rgba(20, 20, 40, 0.9);
		padding: 30px 40px;
		border-radius: 15px;
		text-align: center;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(100, 100, 200, 0.7);
		min-width: 300px;
	}

	.summary-title {
		font-size: 2.2rem; /* Adjusted */
		margin-bottom: 10px; /* Adjusted */
		color: #40c9ff;
	}

	.summary-artist,
	.summary-difficulty {
		font-size: 1rem;
		color: #aaa;
		margin-bottom: 15px;
	}

	.summary-stat {
		font-size: 1.4rem; /* Adjusted */
		margin: 8px 0; /* Adjusted */
	}

	.stat-value {
		font-weight: bold;
		color: #ffd700;
	}

	.summary-buttons {
		display: flex;
		justify-content: center; /* Spaced out buttons */
		gap: 20px; /* Space between buttons */
		margin-top: 25px; /* Adjusted */
	}

	.summary-button {
		display: inline-block;
		padding: 10px 20px; /* Adjusted */
		color: white;
		text-decoration: none;
		border-radius: 8px;
		font-size: 1rem; /* Adjusted */
		font-weight: bold;
		transition:
			background-color 0.3s ease,
			transform 0.2s ease;
		border: none;
		cursor: pointer;
	}

	.retry-button {
		background-color: #40c9ff;
		color: black;
	}
	.retry-button:hover {
		background-color: #60daff;
		transform: translateY(-2px);
	}

	.exit-button {
		background-color: #ff4081;
		color: white;
	}
	.exit-button:hover {
		background-color: #ff60a1;
		transform: translateY(-2px);
	}
</style>
