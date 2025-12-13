<script lang="ts">
import { onMount } from "svelte"; // Added onMount
import { goto } from "$app/navigation";
import { page } from "$app/state";
import GameResultsDisplay from "$lib/components/game/GameResultsDisplay.svelte";
import { orpcClient } from "$lib/rpc/client"; // Added orpcClient
import type { ClientSong, ClientChart } from "$lib/types";

// Access navigation state
let finalScore = $derived(page.state?.finalScore ?? 0);
let finalMaxCombo = $derived(page.state?.maxCombo ?? 0);
// Now we get songId and chartDifficultyName from state
let songId = $derived<string | null>(page.state?.songId ?? null);
let chartDifficultyName = $derived<string | null>(page.state?.chartDifficultyName ?? null);
let roomId = $derived<string | null>(page.state?.roomId ?? null);

// Local state for fetched data
let songData = $state<ClientSong | null>(null);
let chartData = $state<ClientChart | null>(null);
let fetchError = $state<string | null>(null);

// Determine if we have enough data (including fetched data)
let isLoading = $derived(!(songData && chartData && roomId) || !!fetchError); // !!fetchError for boolean check

onMount(async () => {
	if (!songId || !chartDifficultyName) {
		fetchError = "Missing song or chart information.";
		return;
	}

	try {
		const fetchedSong = await orpcClient.song.get({ id: songId });
		if (!fetchedSong) {
			fetchError = "Song not found.";
			return;
		}
		songData = fetchedSong;

		const charts = Array.isArray(fetchedSong.charts) ? fetchedSong.charts : [];
		const fetchedChart = charts.find(c => c.difficultyName === chartDifficultyName);
		if (!fetchedChart) {
			fetchError = "Chart not found for selected difficulty.";
			return;
		}
		chartData = fetchedChart;
	} catch (e) {
		console.error("Failed to fetch song/chart data:", e);
		fetchError = "Failed to load song or chart data.";
	}
});

async function handleReturnToLobby() {
	if (roomId) {
		// Optionally send a message to the server to signal leaving results page or clean up
		// gameSocket.send("leave_results", { roomId });
		goto(`/multiplayer/room/${roomId}`);
	} else {
		goto('/multiplayer'); // Fallback to general multiplayer lobby
	}
}
</script>

<svelte:head>
	<title>Multiplayer Results{songData ? `: ${songData.title}` : ''}</title>
</svelte:head>

<div class="results-container">
	{#if isLoading}
		<div class="loading-container">
			<div class="loading-spinner">Loading multiplayer results...</div>
		</div>
	{:else if fetchError}
		<div class="error-container">
			<h2 class="text-xl font-bold mb-2 text-white">Error</h2>
			<p class="text-red-200">{fetchError}</p>
			<button
				onclick={() => goto(`/multiplayer/room/${roomId}`)}
				class="mt-4 px-6 py-2 bg-white text-red-900 font-bold rounded hover:bg-gray-200"
			>
				RETURN TO LOBBY
			</button>
		</div>
	{:else}
		<div class="results-content">
			<h1 class="results-title">Match Finished!</h1>

			{#if songData && chartData}
				<GameResultsDisplay
					score={finalScore}
					maxCombo={finalMaxCombo}
					songTitle={songData.title}
					artist={songData.artist}
					difficultyName={chartData.difficultyName}
				/>
			{/if}

			<div class="multiplayer-scoreboard-placeholder">
				<h2>Multiplayer Scoreboard</h2>
				<p>-- Scoreboard data will be displayed here --</p>
				<!-- TODO: Implement actual multiplayer scoreboard fetching and display -->
			</div>

			<div class="results-actions">
				<button class="action-button exit-button" onclick={handleReturnToLobby}>
					Return to Lobby
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

	.error-container {
		background-color: rgba(255, 0, 0, 0.2);
		border: 1px solid red;
		padding: 20px;
		border-radius: 8px;
		text-align: center;
		max-width: 400px;
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
		max-width: 800px; /* Wider for potential scoreboard */
		width: 90%;
	}

	.results-title {
		font-size: 2.5rem;
		margin-bottom: 1.5rem;
		color: #40c9ff;
		text-shadow: 0 0 10px rgba(64, 201, 255, 0.5);
	}

	.multiplayer-scoreboard-placeholder {
		margin-top: 2rem;
		padding: 1rem;
		border: 1px dashed #40c9ff;
		border-radius: 8px;
		color: #aaa;
	}

	.multiplayer-scoreboard-placeholder h2 {
		font-size: 1.5rem;
		color: #40c9ff;
		margin-bottom: 0.5rem;
	}

	.results-actions {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
		margin-top: 2.5rem;
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
