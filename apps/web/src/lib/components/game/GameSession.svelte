<script lang="ts">
import ComboMeter from "$lib/components/ComboMeter.svelte";
import CountdownOverlay from "$lib/components/CountdownOverlay.svelte";
import FinishOverlay from "$lib/components/FinishOverlay.svelte";
import LevitatingTextOverlay from "$lib/components/LevitatingTextOverlay.svelte";
import PauseScreen from "$lib/components/PauseScreen.svelte";
import ScreenPulse from "$lib/components/ScreenPulse.svelte";
import SummaryScreen from "$lib/components/SummaryScreen.svelte";
import ScoreDisplay from "$lib/components/ScoreDisplay.svelte";
import { createGame, type GamePhase } from "$lib/game/game.client.js";
import MultiplayerLeaderboard from "$lib/components/game/MultiplayerLeaderboard.svelte";
import { socketStatus, gameSocket, currentRoomState } from "$lib/network/socket";
import { Colors } from "$lib/types/game";
import { onMount } from "svelte";
import type { ClientSong, ClientChart } from "$lib/types";

interface GameSessionCallbacks {
	onScoreUpdate?: (score: number, combo: number, maxCombo: number) => void;
	onMatchFinished?: (finalScore: number, maxCombo: number) => void;
	onRetry?: () => void;
	onExit: () => void;
}

interface Props {
	songData: ClientSong;
	chartData: ClientChart;
	callbacks: GameSessionCallbacks;
	showMultiplayerLeaderboard?: boolean;
	canPause?: boolean;
	isMultiplayer?: boolean;
}

const { songData, chartData, callbacks, showMultiplayerLeaderboard = false, canPause = true, isMultiplayer = false }: Props = $props();

// Multiplayer state
let isWaitingForPlayers = $state(false);

let gamePhaseStore = $state<GamePhase>("loading");
let countdownValueStore = $state<number>(3);
let currentScoreStore = $state<number>(0);
let currentComboStore = $state<number>(0);
let maxComboSoFarStore = $state<number>(0);
let isPausedStore = $state<boolean>(false);
let currentSongTimeMsStore = $state<number>(0);

let canvasElement: HTMLCanvasElement;
let canvasElementContainer: HTMLDivElement;
let screenPulseComponent: ScreenPulse;

let gameInstance: Awaited<ReturnType<typeof createGame>> | null = null;

// --- UI derived states ---
const showCountdownOverlay = $derived(gamePhaseStore === "countdown");
const showFinishOverlay = $derived(gamePhaseStore === "finished");
const showSummaryScreen = $derived(gamePhaseStore === "summary");
const showPauseScreen = $derived(
	isPausedStore &&
		gamePhaseStore !== "summary" &&
		gamePhaseStore !== "finished",
);
const showLevitatingTextOverlay = $derived(
	gamePhaseStore === "playing" || gamePhaseStore === "countdown",
);
const showComboMeter = $derived(
	currentComboStore > 0 &&
		(gamePhaseStore === "playing" || gamePhaseStore === "countdown"),
);

// --- Svelte Lifecycle ---
onMount(() => {
	let cleanupCalled = false;

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape" && canPause) {
			if (isPausedStore) {
				gameInstance?.resumeGame();
				isPausedStore = false;
			} else if (
				gamePhaseStore === "playing" ||
				gamePhaseStore === "countdown"
			) {
				gameInstance?.pauseGame();
				isPausedStore = true;
			}
			event.preventDefault();
			return;
		}
		if (!gameInstance || isPausedStore || gamePhaseStore !== "playing") return;
		gameInstance.handleKeyPress(event.key.toLowerCase());
	};

	const handleKeyUp = (event: KeyboardEvent) => {
		if (!gameInstance) return;
		if (gamePhaseStore === "summary" || gamePhaseStore === "finished") return;
		gameInstance.handleKeyRelease(event.key.toLowerCase());
	};

	const handleResize = () => {
		gameInstance?.handleResize();
	};

	const handlePageFocusChange = () => {
		if (!gameInstance || !canPause) return;

		if (document.hidden) {
			if (
				(gamePhaseStore === "playing" || gamePhaseStore === "countdown") &&
				!isPausedStore
			) {
				gameInstance.pauseGame();
				isPausedStore = true;
				console.log("Game paused due to page visibility change (hidden)");
			}
		}
	};

	const handleWindowBlur = () => {
		if (!gameInstance || !canPause) return;
		if (
			(gamePhaseStore === "playing" || gamePhaseStore === "countdown") &&
			!isPausedStore
		) {
			gameInstance.pauseGame();
			isPausedStore = true;
			console.log("Game paused due to window losing focus (blur)");
		}
	};

	const initializeGame = async () => {
		gameInstance = await createGame(
			songData,
			chartData,
			canvasElement,
			{
				onPhaseChange: (phase: GamePhase) => {
					gamePhaseStore = phase;
					if (!(phase === "playing" || phase === "countdown")) {
						isPausedStore = false;
					}
					// Notify parent when match finishes
					if (phase === "summary") {
						callbacks.onMatchFinished?.(currentScoreStore, maxComboSoFarStore);
					}
				},
				onCountdownUpdate: (value: number) => (countdownValueStore = value),
				onSongEnd: () => {},
				onScoreUpdate: (score: number, combo: number, maxCombo: number) => {
					currentScoreStore = score;
					currentComboStore = combo;
					maxComboSoFarStore = maxCombo;
					callbacks.onScoreUpdate?.(score, combo, maxCombo);
				},
				onNoteHit: (note, judgment) => {
					if (screenPulseComponent) {
						const canvasRect = canvasElement.getBoundingClientRect();
						const highwayMetrics = gameInstance?.getHighwayMetrics();
						if (!highwayMetrics) return;

						const color =
							Colors.LANE_COLORS[note.lane % Colors.LANE_COLORS.length];

						const laneX =
							canvasRect.left +
							highwayMetrics.x +
							highwayMetrics.laneWidth * note.lane +
							highwayMetrics.laneWidth / 2;
						const laneY = canvasRect.top + highwayMetrics.judgmentLineYPosition;

						screenPulseComponent.triggerPulse(
							laneX,
							laneY,
							color,
							0.3,
							50,
							300,
						);
					}
				},
				onNoteMiss: () => {},
				getGamePhase: () => gamePhaseStore,
				getIsPaused: () => isPausedStore,
				getCountdownValue: () => countdownValueStore,
				onTimeUpdate: (timeMs: number) => {
					currentSongTimeMsStore = timeMs;
				},
				onAudioLoaded: () => {
					if (isMultiplayer) {
						console.log("[GameSession] Audio loaded, sending client_ready");
						isWaitingForPlayers = true;
						gameSocket.send("client_ready", {});
					}
				},
			},
			{ manualStart: isMultiplayer },
		);

		try {
			// For solo mode, start immediately
			if (!isMultiplayer) {
				gameInstance.beginGameplaySequence();
			}
			// For multiplayer, wait for room state to transition to 'starting'

			window.addEventListener("keydown", handleKeyDown);
			window.addEventListener("keyup", handleKeyUp);
			window.addEventListener("resize", handleResize);
			document.addEventListener("visibilitychange", handlePageFocusChange);
			window.addEventListener("blur", handleWindowBlur);
		} catch (err) {
			console.error(
				"Error during game initialization or event listener setup:",
				err,
			);
			alert(
				"Failed to initialize the game. Please check the console for errors.",
			);
			if (gameInstance) {
				gameInstance.cleanup();
				gameInstance = null;
			}
		}
	};

	initializeGame().catch((err) => {
		console.error("Unhandled error from initializeGame promise:", err);
	});

	// Subscribe to room state changes for multiplayer countdown sync
	let unsubRoomState: (() => void) | undefined;
	if (isMultiplayer) {
		unsubRoomState = currentRoomState.subscribe((state) => {
			if (!state) return;

			// When room transitions to 'starting', all players are ready - start countdown
			if (state.status === "starting" && isWaitingForPlayers && gameInstance) {
				console.log("[GameSession] All players ready! Starting countdown");
				isWaitingForPlayers = false;
				gameInstance.startCountdown();
			}
		});
	}

	return () => {
		if (cleanupCalled) return;
		cleanupCalled = true;
		console.log(
			"Destroying GameSession component, calling gameInstance.cleanup()",
		);
		window.removeEventListener("keydown", handleKeyDown);
		window.removeEventListener("keyup", handleKeyUp);
		window.removeEventListener("resize", handleResize);
		document.removeEventListener("visibilitychange", handlePageFocusChange);
		window.removeEventListener("blur", handleWindowBlur);

		unsubRoomState?.();
		gameInstance?.cleanup();
		gameInstance = null;
	};
});

function handleRetry() {
	console.log('Retry clicked');
	currentScoreStore = 0;
	currentComboStore = 0;
	maxComboSoFarStore = 0;
	isPausedStore = false;
	callbacks.onRetry?.();
	gameInstance?.beginGameplaySequence();
}

function handleExit() {
	if (gameInstance) {
		gameInstance.cleanup();
		gameInstance = null;
	}
	callbacks.onExit();
}
</script>

<div
	class="gameplay-container"
	bind:this={canvasElementContainer}
	style="--bg-url: url('{songData.imageUrl}');"
>
	<canvas bind:this={canvasElement}></canvas>
	<ScreenPulse bind:this={screenPulseComponent} />
	{#if isWaitingForPlayers}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
			<div class="text-center">
				<div class="text-3xl font-bold text-cyan-400 mb-4 animate-pulse">
					WAITING FOR PLAYERS...
				</div>
				<div class="text-lg text-gray-400">
					All players must load the song before starting
				</div>
			</div>
		</div>
	{/if}
	{#if showCountdownOverlay}
		<CountdownOverlay countdownValue={countdownValueStore} />
	{/if}
	{#if showFinishOverlay}
		<FinishOverlay />
	{/if}
	{#if showSummaryScreen}
		<SummaryScreen
			score={currentScoreStore}
			maxCombo={maxComboSoFarStore}
			songTitle={songData.title}
			artist={songData.artist}
			difficultyName={chartData.difficultyName}
			onRetry={handleRetry}
			onExit={handleExit}
		/>
	{/if}
	{#if showPauseScreen && canPause}
		<PauseScreen
			onResume={() => {
				gameInstance?.resumeGame();
				isPausedStore = false;
			}}
			onRetry={handleRetry}
			onExit={handleExit}
		/>
	{/if}

	{#if showLevitatingTextOverlay}
		<LevitatingTextOverlay
			title={songData.title}
			artist={songData.artist}
			difficultyName={chartData.difficultyName}
			bpm={songData.bpm}
			songTimeMs={currentSongTimeMsStore}
		/>
	{/if}

	{#if showComboMeter}
		<ComboMeter combo={currentComboStore} />
	{/if}

	<ScoreDisplay score={currentScoreStore} />

	{#if showMultiplayerLeaderboard && $socketStatus === 'connected'}
		<MultiplayerLeaderboard />
	{/if}
</div>

<style>
	:global(html, body) {
		overflow: hidden !important;
		height: 100% !important;
		margin: 0 !important;
		padding: 0 !important;
		background-color: #000;
	}
	.gameplay-container {
		width: 100vw;
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		z-index: 0;
		background-size: cover;
		background-position: center center;
		background-repeat: no-repeat;
	}
	.gameplay-container::before {
		content: '';
		filter: blur(16px) brightness(0.5);
		position: absolute;
		inset: 0;
		z-index: -1;
		background-image: var(--bg-url);
		background-size: cover;
		background-position: center center;
		background-repeat: no-repeat;
		opacity: 1;
		pointer-events: none;
	}

	canvas {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>

