<script lang="ts">
	import { goto } from '$app/navigation';
	import ComboMeter from '$lib/components/ComboMeter.svelte';
	import CountdownOverlay from '$lib/components/CountdownOverlay.svelte';
	import FinishOverlay from '$lib/components/FinishOverlay.svelte';
	import LevitatingTextOverlay from '$lib/components/LevitatingTextOverlay.svelte';
	import PauseScreen from '$lib/components/PauseScreen.svelte';
	import ScreenPulse from '$lib/components/ScreenPulse.svelte';
	import SummaryScreen from '$lib/components/SummaryScreen.svelte';
	import ScoreDisplay from '$lib/components/ScoreDisplay.svelte';
	import { onMount } from 'svelte';
	import { createGameEngine, type GameEngineInstance, type GamePhase } from '$lib/game/game-engine.js';

	const { data } = $props();

	const metadataDisplay = { title: data.songData.title, artist: data.songData.artist };

	let gamePhaseStore = $state<GamePhase>('loading');
	let countdownValueStore = $state<number>(3);
	let currentScoreStore = $state<number>(0);
	let currentComboStore = $state<number>(0);
	let maxComboSoFarStore = $state<number>(0);
	let isPausedStore = $state<boolean>(false);
	let currentSongTimeMsStore = $state<number>(0); // New store for current song time

	let canvasElementContainer: HTMLDivElement;
	let screenPulseComponent: ScreenPulse;

	let gameInstance: GameEngineInstance | null = null;

	// --- UI derived states ---
	let showCountdownOverlay = $derived(gamePhaseStore === 'countdown');
	let showFinishOverlay = $derived(gamePhaseStore === 'finished');
	let showSummaryScreen = $derived(gamePhaseStore === 'finished');
	let showPauseScreen = $derived(
		isPausedStore && gamePhaseStore !== 'finished'
	);
	let showLevitatingTextOverlay = $derived(
		gamePhaseStore === 'playing' || gamePhaseStore === 'countdown'
	);
	let showComboMeter = $derived(
		currentComboStore > 0 && (gamePhaseStore === 'playing' || gamePhaseStore === 'countdown')
	);

	// --- Svelte Lifecycle ---
	onMount(() => {
		let cleanupCalled = false;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (isPausedStore) {
					gameInstance?.resumeGame();
					isPausedStore = false;
				} else if (gamePhaseStore === 'playing' || gamePhaseStore === 'countdown') {
					gameInstance?.pauseGame();
					isPausedStore = true;
				}
				event.preventDefault();
				return;
			}
			if (!gameInstance || isPausedStore || gamePhaseStore !== 'playing') return;
			gameInstance.handleKeyPress(event.key.toLowerCase(), event);
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			if (!gameInstance) return;
			if (gamePhaseStore === 'finished') return;
			gameInstance.handleKeyRelease(event.key.toLowerCase(), event);
		};

		const handleResize = () => {
			gameInstance?.handleResize?.();
		};

		const handlePageFocusChange = () => {
			if (!gameInstance) return;

			if (document.hidden) {
				// Pause the game if it's in a pausable state and not already paused
				if ((gamePhaseStore === 'playing' || gamePhaseStore === 'countdown') && !isPausedStore) {
					gameInstance.pauseGame();
					isPausedStore = true;
					console.log('Game paused due to page visibility change (hidden)');
				}
			} else {
				// This else block handles when the tab becomes visible again.
				// We might resume here IF it was paused by this visibility change logic AND not by window blur.
				// However, to simplify, window.onfocus will be the primary trigger for resuming.
				// If needed, more complex state tracking could be added here.
			}
		};

		const handleWindowBlur = () => {
			if (!gameInstance) return;
			if ((gamePhaseStore === 'playing' || gamePhaseStore === 'countdown') && !isPausedStore) {
				gameInstance.pauseGame();
				isPausedStore = true;
				console.log('Game paused due to window losing focus (blur)');
			}
		};

		const initializeGame = async () => {
			gameInstance = await createGameEngine(data.songData, data.chartData, {
				onPhaseChange: (phase: GamePhase) => {
					gamePhaseStore = phase;
					if (!(phase === 'playing' || phase === 'countdown')) {
						isPausedStore = false;
					}
				},
				onCountdownUpdate: (value: number) => (countdownValueStore = value),
				onSongEnd: () => {},
				onScoreUpdate: (score: number, combo: number, maxCombo: number) => {
					currentScoreStore = score;
					currentComboStore = combo;
					maxComboSoFarStore = maxCombo;
				},
				onNoteHit: (noteId, judgment, score, lane) => {
					if (lane !== undefined && screenPulseComponent) {
						const containerRect = canvasElementContainer.getBoundingClientRect();
						// Estimate lane position based on container width and lane count
						const laneWidth = containerRect.width / data.chartData.lanes;
						const laneX = containerRect.left + laneWidth * lane + laneWidth / 2;
						const laneY = containerRect.top + containerRect.height * 0.8; // Estimate receptor position
						
						// Use a default color based on lane
						const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
						const color = colors[lane % colors.length];
						
						screenPulseComponent.triggerPulse(laneX, laneY, color, 0.3, 50, 300);
					}
				},
				onNoteMiss: () => {},
				onTimeUpdate: (timeMs: number) => {
					currentSongTimeMsStore = timeMs;
				}
			});

			try {
				gameInstance.startGameplay();

				window.addEventListener('keydown', handleKeyDown);
				window.addEventListener('keyup', handleKeyUp);
				window.addEventListener('resize', handleResize);
				document.addEventListener('visibilitychange', handlePageFocusChange);
				window.addEventListener('blur', handleWindowBlur);
			} catch (err) {
				console.error('Error during game initialization or event listener setup:', err);
				alert('Failed to initialize the game. Please check the console for errors.');
				if (gameInstance) {
					gameInstance.cleanup();
					gameInstance = null;
				}
			}
		};

		initializeGame().catch((err) => {
			console.error('Unhandled error from initializeGame promise:', err);
		});

		return () => {
			if (cleanupCalled) return;
			cleanupCalled = true;
			console.log('Destroying Gameplay Svelte component, calling gameInstance.cleanup()');
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('resize', handleResize);
			document.removeEventListener('visibilitychange', handlePageFocusChange);
			window.removeEventListener('blur', handleWindowBlur);

			gameInstance?.cleanup();
			gameInstance = null;
		};
	});
</script>

<svelte:head>
	<title>Playing: {metadataDisplay.title}</title>
</svelte:head>

<div
	class="gameplay-container"
	bind:this={canvasElementContainer}
	style="--bg-url: url('{data.songData.imageUrl}');"
>
	<!-- Canvas is now managed by the game engine -->
	<ScreenPulse bind:this={screenPulseComponent} />
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
			songTitle={metadataDisplay.title}
			artist={metadataDisplay.artist}
			difficultyName={data.chartData.difficultyName}
			onRetry={() => {
				console.log('Retry clicked on SummaryScreen');
				currentScoreStore = 0;
				currentComboStore = 0;
				maxComboSoFarStore = 0;
				isPausedStore = false;
				gameInstance?.startGameplay();
			}}
			onExit={() => {
				if (gameInstance) {
					gameInstance.cleanup();
					gameInstance = null; // Explicitly nullify to prevent further use
				}
				goto('/solo');
			}}
		/>
	{/if}
	{#if showPauseScreen}
		<PauseScreen
			onResume={() => {
				gameInstance?.resumeGame();
				isPausedStore = false;
			}}
			onRetry={() => {
				console.log('Retry clicked on PauseScreen');
				currentScoreStore = 0;
				currentComboStore = 0;
				maxComboSoFarStore = 0;
				isPausedStore = false;
				gameInstance?.startGameplay();
			}}
			onExit={() => {
				if (gameInstance) {
					gameInstance.cleanup();
					gameInstance = null; // Explicitly nullify to prevent further use
				}
				goto('/solo');
			}}
		/>
	{/if}

	{#if showLevitatingTextOverlay}
		<LevitatingTextOverlay
			title={metadataDisplay.title}
			artist={metadataDisplay.artist}
			difficultyName={data.chartData.difficultyName}
			bpm={data.songData.bpm}
			songTimeMs={currentSongTimeMsStore}
		/>
	{/if}

	{#if showComboMeter}
		<ComboMeter combo={currentComboStore} />
	{/if}

	<ScoreDisplay score={currentScoreStore} />
</div>

<!-- Placeholder for canvas and overlay elements -->
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


</style>
