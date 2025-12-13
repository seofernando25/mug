<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { gameSocket, currentRoomState, socketStatus } from "$lib/network/socket";
import GameSession from "$lib/components/game/GameSession.svelte";
import { orpcClient } from "$lib/rpc/client";
import type { ClientSong, ClientChart } from "$lib/types";

// State
let roomId = $state<string | null>(null);
let isLoading = $state(true);
let error = $state<string | null>(null);
let songData = $state<ClientSong | null>(null);
let chartData = $state<ClientChart | null>(null);

// Derived from room state
const roomState = $derived($currentRoomState);

onMount(() => {
	roomId = page.params.roomId;

	// Guard clause: If no room state or no chart data, redirect back to room lobby
	if (!roomState || !roomState.currentChart?.songId) {
		console.warn("[Multiplayer Game] No room state or chart data found, redirecting to room lobby");
		goto(`/multiplayer/room/${roomId}`);
		return;
	}

	// Connect socket if not already connected
	if ($socketStatus !== "connected") {
		gameSocket.connect();
	}

	// Load song and chart data based on room state
	loadGameData();
});

async function loadGameData() {
	if (!roomState?.currentChart?.songId) {
		error = "No song selected in room";
		isLoading = false;
		return;
	}

	try {
		const song = await orpcClient.song.get({ id: roomState.currentChart.songId });
		if (!song) {
			error = "Song not found";
			isLoading = false;
			return;
		}

		songData = song;

		// Find the chart matching the selected difficulty
		const charts = Array.isArray(song.charts) ? song.charts : [];
		const selectedDifficulty = roomState.currentChart.difficulty;
		
		const chart = charts.find((c) => c.difficultyName === selectedDifficulty) || charts[0];
		if (!chart) {
			error = "Chart not found for selected difficulty";
			isLoading = false;
			return;
		}

		chartData = chart;
		isLoading = false;
	} catch (e) {
		console.error("[Multiplayer Game] Error loading game data:", e);
		error = "Failed to load song data";
		isLoading = false;
	}
}

function handleScoreUpdate(score: number, combo: number, maxCombo: number) {
	// Send score update to other players via WebSocket
	gameSocket.send("score_update", {
		score,
		combo,
		maxCombo,
	});
}

function handleMatchFinished(finalScore: number, maxCombo: number) {
	// Notify other players that we finished
	gameSocket.send("match_finished", {
		score: finalScore,
		maxCombo,
	});
	console.log("[Multiplayer] Match finished, score:", finalScore);
}

function handleRetry() {
	// In multiplayer, retry would need coordination - for now just log
	console.log("[Multiplayer] Retry requested - not supported in multiplayer mode");
}

function handleExit() {
	// Leave the room and go back to multiplayer lobby
	if (roomId) {
		gameSocket.send("leave_room", { roomId });
	}
	goto("/multiplayer");
}
</script>

<svelte:head>
	<title>Multiplayer Match{songData ? `: ${songData.title}` : ''}</title>
</svelte:head>

{#if isLoading}
	<div class="loading-container">
		<div class="animate-pulse text-2xl font-light tracking-widest text-cyan-400">
			LOADING MATCH...
		</div>
	</div>
{:else if error}
	<div class="error-container">
		<div class="bg-red-900/80 border border-red-500 p-6 rounded-xl text-center backdrop-blur-sm">
			<h2 class="text-xl font-bold mb-2 text-white">Error</h2>
			<p class="text-red-200">{error}</p>
			<button
				onclick={() => goto('/multiplayer')}
				class="mt-4 px-6 py-2 bg-white text-red-900 font-bold rounded hover:bg-gray-200"
			>
				RETURN TO LOBBY
			</button>
		</div>
	</div>
{:else if songData && chartData}
	<GameSession
		{songData}
		{chartData}
		showMultiplayerLeaderboard={true}
		canPause={false}
		isMultiplayer={true}
		callbacks={{
			onScoreUpdate: handleScoreUpdate,
			onMatchFinished: handleMatchFinished,
			onRetry: handleRetry,
			onExit: handleExit,
		}}
	/>
{/if}

<style>
	.loading-container,
	.error-container {
		width: 100vw;
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #111827;
	}
</style>

