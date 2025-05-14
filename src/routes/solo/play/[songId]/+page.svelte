<script lang="ts">
	import { goto } from '$app/navigation';
	import { type ChartData, type GamePhase, type Note, type SongData } from '$lib/game';
	import { onMount } from 'svelte';

	import CountdownOverlay from '$lib/components/CountdownOverlay.svelte';
	import FinishOverlay from '$lib/components/FinishOverlay.svelte';
	import PauseScreen from '$lib/components/PauseScreen.svelte';
	import SummaryScreen from '$lib/components/SummaryScreen.svelte';

	import { createGame, type GameInstance } from '$lib/game';
	import LevitatingTextOverlay from '$lib/components/LevitatingTextOverlay.svelte';

	// Data from +page.ts load function, already transformed
	const { data } = $props<{ data: { songId: string; songData: SongData; chartData: ChartData } }>();
	const { songId, songData, chartData } = data;
	// songData is GameSongData, chartData is GameChartData

	// For display purposes on SummaryScreen, etc.
	const metadataDisplay = { title: songData.title, artist: songData.artist };

	let gamePhaseStore = $state<GamePhase>('loading');
	let countdownValueStore = $state<number>(3);
	let currentScoreStore = $state<number>(0);
	let currentComboStore = $state<number>(0);
	let maxComboSoFarStore = $state<number>(0);
	let isPausedStore = $state<boolean>(false);
	let currentSongTimeMsStore = $state<number>(0); // New store for current song time

	let canvasElement: HTMLCanvasElement;
	let canvasElementContainer: HTMLDivElement;

	let gameInstance: GameInstance | null = null;

	// --- UI derived states ---
	let showCountdownOverlay = $derived(gamePhaseStore === 'countdown');
	let showFinishOverlay = $derived(gamePhaseStore === 'finished');
	let showSummaryScreen = $derived(gamePhaseStore === 'summary');
	let showPauseScreen = $derived(
		isPausedStore && gamePhaseStore !== 'summary' && gamePhaseStore !== 'finished'
	);
	let showLevitatingTextOverlay = $derived(gamePhaseStore === 'playing'); // Condition for LevitatingTextOverlay

	// --- Svelte Lifecycle ---
	onMount(() => {
		let cleanupCalled = false;
		let localGameInstance: GameInstance | null = null;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (isPausedStore) {
					localGameInstance?.resumeGame();
					isPausedStore = false;
				} else if (gamePhaseStore === 'playing' || gamePhaseStore === 'countdown') {
					localGameInstance?.pauseGame();
					isPausedStore = true;
				}
				event.preventDefault();
				return;
			}
			if (!localGameInstance || isPausedStore || gamePhaseStore !== 'playing') return;
			localGameInstance.handleKeyPress(event.key.toLowerCase(), event);
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			if (!localGameInstance) return;
			if (gamePhaseStore === 'summary' || gamePhaseStore === 'finished') return;
			localGameInstance.handleKeyRelease(event.key.toLowerCase(), event);
		};

		const handleResize = () => {
			localGameInstance?.handleResize();
		};

		const initializeGame = async () => {
			if (!canvasElement || !canvasElementContainer) {
				alert('Canvas element or container not found on mount.');
				console.error('Canvas element or container not found on mount.');
				return;
			}

			localGameInstance = createGame(songData, chartData, {
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
				onNoteHit: (note: Note, judgment: string) => {},
				onNoteMiss: (note: Note) => {},
				getGamePhase: () => gamePhaseStore,
				getIsPaused: () => isPausedStore,
				getCountdownValue: () => countdownValueStore,
				onTimeUpdate: (timeMs: number) => {
					currentSongTimeMsStore = timeMs;
					// console.log('currentSongTimeMsStore', currentSongTimeMsStore); // User can re-enable if needed
				}
			});
			gameInstance = localGameInstance;

			try {
				await localGameInstance.initialize(canvasElement);
				localGameInstance.beginGameplaySequence();

				window.addEventListener('keydown', handleKeyDown);
				window.addEventListener('keyup', handleKeyUp);
				window.addEventListener('resize', handleResize);
			} catch (err) {
				console.error('Error during game initialization or event listener setup:', err);
				alert('Failed to initialize the game. Please check the console for errors.');
				if (localGameInstance) {
					localGameInstance.cleanup();
					localGameInstance = null;
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

			localGameInstance?.cleanup();
			gameInstance = null;
		};
	});
</script>

<svelte:head>
	<title>Playing: {metadataDisplay.title}</title>
</svelte:head>

<div class="gameplay-container" bind:this={canvasElementContainer}>
	<canvas bind:this={canvasElement}></canvas>
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
			difficultyName={chartData.difficultyName}
			onRetry={() => {
				console.log('Retry clicked on SummaryScreen');
				currentScoreStore = 0;
				currentComboStore = 0;
				maxComboSoFarStore = 0;
				isPausedStore = false;
				gameInstance?.beginGameplaySequence();
			}}
			onExit={() => goto('/solo')}
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
				gameInstance?.beginGameplaySequence();
			}}
			onExit={() => goto('/solo')}
		/>
	{/if}

	{#if showLevitatingTextOverlay}
		<LevitatingTextOverlay
			title={metadataDisplay.title}
			artist={metadataDisplay.artist}
			difficultyName={chartData.difficultyName}
			songTimeMs={currentSongTimeMsStore}
			bpm={songData.bpm > 0 ? songData.bpm : 120}
		/>
	{/if}
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
		background-color: #1a1a1a;
	}

	canvas {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
