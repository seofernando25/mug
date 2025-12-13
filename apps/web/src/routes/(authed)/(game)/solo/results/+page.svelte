<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import type { ClientSong, ClientChart } from "$lib/types";

// Access navigation state
let finalScore = $derived(page.state?.score ?? 0);
let finalMaxCombo = $derived(page.state?.maxCombo ?? 0);
let song = $derived<ClientSong | null>(page.state?.songData ?? null);
let chart = $derived<ClientChart | null>(page.state?.chartData ?? null);

let isLoading = $derived(!(page.state?.score !== undefined && page.state?.maxCombo !== undefined && song && chart));

async function handleRetry() {
	if (song && chart) {
		await goto(`/solo/play/${song.id}?difficulty=${encodeURIComponent(chart.difficultyName)}`);
	}
}

async function handleExit() {
	await goto('/solo');
}
</script>

<svelte:head>
	<title>Results: {song?.title || 'Song'}</title>
</svelte:head>

<div class="results-container">
	{#if isLoading}
		<div class="loading-container">
			<div class="loading-spinner">Loading results...</div>
		</div>
	{:else}
		<div class="results-content">
			<h1 class="results-title">Song Cleared!</h1>

			{#if song}
				<div class="song-info">
					<h2 class="song-title">{song.title}</h2>
					<p class="song-artist">{song.artist}</p>
					{#if chart}
						<p class="difficulty">Difficulty: {chart.difficultyName}</p>
					{/if}
				</div>
			{/if}

			<div class="results-stats">
				<div class="stat-card">
					<h3>Score</h3>
					<p class="stat-value">{finalScore.toLocaleString()}</p>
				</div>
				<div class="stat-card">
					<h3>Max Combo</h3>
					<p class="stat-value">{finalMaxCombo}</p>
				</div>
			</div>

			<div class="results-actions">
				<button class="action-button retry-button" onclick={handleRetry}>
					 retry
				</button>
				<button class="action-button exit-button" onclick={handleExit}>
					exit to menu
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.results-container {
		width: 100vw;
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		color: white;
		font-family: 'Inter', sans-serif;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	.loading-spinner {
		font-size: 1.5rem;
		color: #40c9ff;
	}

	.results-content {
		text-align: center;
		background: rgba(30, 30, 50, 0.8);
		padding: 3rem;
		border-radius: 16px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(100, 100, 200, 0.3);
		max-width: 600px;
		width: 90%;
	}

	.results-title {
		font-size: 2.5rem;
		margin-bottom: 1.5rem;
		color: #40c9ff;
		text-shadow: 0 0 10px rgba(64, 201, 255, 0.5);
	}

	.song-info {
		margin-bottom: 2rem;
	}

	.song-title {
		font-size: 1.8rem;
		margin-bottom: 0.5rem;
		color: #e6e6ff;
	}

	.song-artist {
		font-size: 1.2rem;
		color: #a0a0c0;
		margin-bottom: 0.5rem;
	}

	.difficulty {
		font-size: 1rem;
		color: #d0d0ff;
		font-weight: 500;
	}

	.results-stats {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 2.5rem;
	}

	.stat-card {
		background: rgba(50, 50, 70, 0.6);
		padding: 1.5rem;
		border-radius: 12px;
		min-width: 150px;
	}

	.stat-card h3 {
		font-size: 1rem;
		color: #b0b0e0;
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: bold;
		color: #ffd700;
	}

	.results-actions {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
	}

	.action-button {
		padding: 0.8rem 2rem;
		border: none;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.retry-button {
		background: linear-gradient(45deg, #40c9ff, #3d8cbd);
		color: #000;
	}

	.retry-button:hover {
		background: linear-gradient(45deg, #60daff, #5a9fd4);
		transform: translateY(-2px);
		box-shadow: 0 5px 15px rgba(64, 201, 255, 0.4);
	}

	.exit-button {
		background: linear-gradient(45deg, #ff4081, #d43d6f);
		color: white;
	}

	.exit-button:hover {
		background: linear-gradient(45deg, #ff60a1, #e05a8a);
		transform: translateY(-2px);
		box-shadow: 0 5px 15px rgba(255, 64, 129, 0.4);
	}
</style>