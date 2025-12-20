<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { gameSocket, currentRoomState, socketStatus } from "$lib/network/socket";
import GameSession from "$lib/components/game/GameSession.svelte";
import { orpcClient } from "$lib/rpc/client";
import type { ClientSong, ClientChart } from "$lib/types";
import { fly } from "svelte/transition";

// State
let roomId = $state<string | null>(null);
let isLoading = $state(true);
let error = $state<string | null>(null);
let songData = $state<ClientSong | null>(null);
let chartData = $state<ClientChart | null>(null);

// Forfeit State
let forfeitProgress = $state(0);
let isHoldingEsc = $state(false);
let forfeitAnimationFrame: number;

// Derived from room state
const roomState = $derived($currentRoomState);

onMount(() => {
	roomId = page.params.roomId ?? null;

	// Guard clause: If no room state or no chart data, redirect back to room lobby
	if (!roomState || !roomState.currentChart?.songId) {
		console.warn("[Multiplayer Game] No room state or chart data found, redirecting to room lobby");
		// Ensure roomId is not null before redirecting
		if (roomId) {
			goto(`/multiplayer/room/${roomId}`);
		} else {
			goto("/multiplayer"); // Fallback if roomId is null
		}
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

// Callback reference to trigger exit from GameSession (handles cleanup)
let triggerExit: (() => void) | undefined = $state();

function handleMatchFinished(finalScore: number, maxCombo: number) {
	// Notify other players that we finished
	gameSocket.send("match_finished", {
		score: finalScore,
		maxCombo,
	});
	console.log("[Multiplayer] Match finished, score:", finalScore);
	// No more goto! GameSession will show the summary screen automatically
}

function handleRetry() {
	// In multiplayer, retry would need coordination - for now just log
	console.log("[Multiplayer] Retry requested - not supported in multiplayer mode");
}

function handleExit() {
	// Return to the room lobby
	console.log("[Multiplayer] Exiting to room lobby:", roomId);
	if (roomId) {
		goto(`/multiplayer/room/${roomId}`);
	} else {
		goto("/multiplayer");
	}
}

// Forfeit Logic
function handleKeyDown(e: KeyboardEvent) {
	// Only handle if we are in the game
	if (isLoading || error) return;
	
	if (e.key === 'Escape') {
		e.preventDefault(); // Stop browser stop/refresh behaviors
		if (!isHoldingEsc) {
			isHoldingEsc = true;
			startForfeitTimer();
		}
	}
}

function handleKeyUp(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		e.preventDefault();
		isHoldingEsc = false;
		cancelForfeitTimer();
	}
}

function startForfeitTimer() {
	const startTime = performance.now();
	const duration = 2000; // 2 seconds

	const animate = (currentTime: number) => {
		if (!isHoldingEsc) return;

		const elapsed = currentTime - startTime;
		forfeitProgress = Math.min((elapsed / duration) * 100, 100);

		if (forfeitProgress >= 100) {
			console.log("[Multiplayer] Forfeit triggered");
			// Notify server we finished (with current score)
			gameSocket.send("match_finished", {
				score: 0, // Forfeit = 0 score? Or keep current? 0 is safer for forfeit
				maxCombo: 0,
			});
			
			// Use the callback from GameSession to ensure Pixi cleanup happens
			if (triggerExit) {
				triggerExit();
			} else {
				handleExit();
			}
		} else {
			forfeitAnimationFrame = requestAnimationFrame(animate);
		}
	};

	forfeitAnimationFrame = requestAnimationFrame(animate);
}

function cancelForfeitTimer() {
	if (forfeitAnimationFrame) {
		cancelAnimationFrame(forfeitAnimationFrame);
	}
	forfeitProgress = 0;
}
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

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
		bind:triggerExit
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

{#if isHoldingEsc && !isLoading && !error}
	<div 
		class="fixed bottom-0 left-0 w-full h-32 z-[100] flex flex-col justify-end pointer-events-none pb-0"
		transition:fly={{ y: 50, duration: 200 }}
	>
		<!-- Warning Text Area -->
		<div class="w-full text-center pb-4 bg-gradient-to-t from-gray-900/90 to-transparent">
			<p class="text-red-500 font-black tracking-[0.3em] text-xl uppercase drop-shadow-[0_2px_10px_rgba(220,38,38,0.5)] animate-pulse">
				Hold to Forfeit
			</p>
		</div>
		
		<!-- Progress Bar Background -->
		<div class="w-full h-2 bg-gray-900">
			<!-- Progress Bar Fill -->
			<div 
				class="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)] transition-all duration-75 ease-linear"
				style="width: {forfeitProgress}%"
			></div>
		</div>
	</div>
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

