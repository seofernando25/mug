<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// Import types, but not the actual implementation that might rely on browser APIs during SSR
	import type { GamePhase } from '$lib/game/game.client';
	// Corrected import path and aliased types
	import type { ClientSong as SongData, ClientChart as ChartData, ChartHitObject as Note } from '$lib/types';

	// Assume we will get song and chart data as props
	// You will need to pass these down from the parent page.
	let { containerWidth, containerHeight, songData, chartData } = $props();

	let pixiCanvas: HTMLCanvasElement;

	// Infer the type of gameInstance from the resolved value of createGame
	let gameInstance: Awaited<ReturnType<typeof import('$lib/game/game.client').createGame>> | null = null;

	// Define the async initialization function
	async function initializeGame() {
		if (!browser || !songData || !chartData || !pixiCanvas) return;

		// Dynamically import the game creation logic from the client-side file
		const { createGame } = await import('$lib/game/game.client');

		// Define the callbacks needed for createGame, explicitly typing them
		const gameCallbacks = {
			onPhaseChange: (phase: GamePhase) => { console.log('Phase Change:', phase); },
			onCountdownUpdate: (value: number) => { console.log('Countdown:', value); },
			onSongEnd: () => { console.log('Song End'); },
			onScoreUpdate: (score: number, combo: number, maxCombo: number) => { console.log('Score:', score, 'Combo:', combo, 'Max Combo:', maxCombo); },
			onNoteHit: (note: Note, judgment: string, color?: number) => { console.log('Note Hit:', judgment); },
			onNoteMiss: (note: Note) => { console.log('Note Miss:'); },
			getGamePhase: (): GamePhase => 'playing', // Correctly typed placeholder
			getIsPaused: (): boolean => false, // Correctly typed placeholder
			getCountdownValue: (): number => 0, // Correctly typed placeholder
			onTimeUpdate: (currentTimeMs: number) => { /* console.log('Time:', currentTimeMs); */ }, // Correctly typed placeholder
		};

		// Create the game instance (awaiting the promise)
		const instance = await createGame(songData, chartData, pixiCanvas, gameCallbacks); // Added pixiCanvas and awaited
		gameInstance = instance; // Assign the resolved instance
	}

	// Use an effect to call the async function when dependencies are ready
	$effect(() => {
		console.log("Effect triggered. songData:", !!songData, "chartData:", !!chartData, "pixiCanvas:", !!pixiCanvas);
		if (browser && songData && chartData && pixiCanvas) {
			console.log("Dependencies met, initializing game...");
			initializeGame();
		}
	});

	onDestroy(() => {
		if (gameInstance) {
			gameInstance.cleanup();
			gameInstance = null;
		}
	});

	// You might need to expose some game instance methods or state if the parent needs to interact with the game
	// For example:
	// export function handleKeyPress(key: string, event: KeyboardEvent) { gameInstance?.handleKeyPress(key, event); }
	// export function handleKeyRelease(key: string, event: KeyboardEvent) { gameInstance?.handleKeyRelease(key, event); }

</script>

<!-- The canvas element that PixiJS will render into -->
<canvas bind:this={pixiCanvas} style="width: {containerWidth}px; height: {containerHeight}px;"></canvas> 