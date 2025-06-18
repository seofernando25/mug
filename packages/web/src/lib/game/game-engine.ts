import { Preferences } from '$lib/preferences';
import type { orpcClient } from '$lib/rpc-client';
import { initDevtools } from '@pixi/devtools';
import { MainGameRenderer, WebGameAdapter, type GameplaySong, type HitObject } from 'game-engine';
import * as PIXI from 'pixi.js';
import { atom, computed } from 'nanostores';
import { setReceptorActive } from 'game-engine/src/rendering/core/ReceptorRenderer';

// Re-export the GamePhase from game-engine for compatibility
export type { GamePhase } from 'game-engine';

export interface GameEngineCallbacks {
	onPhaseChange: (phase: import('game-engine').GamePhase) => void;
	onCountdownUpdate: (value: number) => void;
	onSongEnd: () => void;
	onScoreUpdate: (score: number, combo: number, maxCombo: number) => void;
	onNoteHit: (noteId: number, judgment: string, score: number, lane?: number) => void;
	onNoteMiss: (noteId: number, lane?: number) => void;
	onTimeUpdate?: (currentTimeMs: number) => void;
}

export interface GameEngineInstance {
	startGameplay: () => void;
	pauseGame: () => void;
	resumeGame: () => void;
	handleKeyPress: (key: string, event: KeyboardEvent) => void;
	handleKeyRelease: (key: string, event: KeyboardEvent) => void;
	cleanup: () => void;
	getCurrentPhase: () => import('game-engine').GamePhase;
	isPaused: () => boolean;
	getCurrentSongTimeMs: () => number;
	getNotesForRendering: () => any[];
	getPlayerStates: () => Map<string, any>;
	// Rendering methods
	getCanvas: () => HTMLCanvasElement;
	handleResize: () => void;
	// Legacy compatibility methods
	getHighwayMetrics?: () => any;
}

/**
 * Create a new game instance using the game-engine WebGameAdapter
 * This replaces the old complex createGame function with a much simpler implementation
 */
export async function createGameEngine(
	songData: Awaited<ReturnType<typeof orpcClient.song.get>>,
	chartData: Awaited<ReturnType<typeof orpcClient.song.get>>['charts'][0],
	canvas: HTMLCanvasElement,
	callbacks: GameEngineCallbacks
): Promise<GameEngineInstance> {

	const cleanup: (() => void)[] = [];
	
	// Get the parent element and its bounding client rect
	const parentElement = canvas.parentElement;
	if (!parentElement) {
		throw new Error('Canvas parent element not found');
	}

	const parentElementRect = atom(parentElement.getBoundingClientRect());

	const resizeObserver = new ResizeObserver((entries) => {
		entries.forEach((entry) => {
			parentElementRect.set(entry.contentRect);
		});
	});
	resizeObserver.observe(parentElement);
	cleanup.push(() => resizeObserver.disconnect());

	// Create PIXI Application with the provided canvas
	const app = new PIXI.Application();
	setTimeout(() => {
		initDevtools({ app });
	}, 1000);
	await app.init({
		canvas: canvas,
		width: parentElementRect.get().width,
		height: parentElementRect.get().height,
		backgroundColor: 0x000000,
		antialias: true,
		resolution: window.devicePixelRatio || 1,
		autoDensity: true,
	});
	cleanup.push(() => {
		app.destroy()
	});

	// Convert chart data to GameplaySong format
	const hitObjects: HitObject[] = chartData.hitObjects.map((ho: any) => ({
		timeMs: ho.time,
		lane: ho.lane,
		noteInfo: ho.note_type === 'hold'
			? { type: 'hold', durationMs: ho.duration || 0 }
			: { type: 'tap' }
	}));

	const song: GameplaySong = {
		audioFilename: songData.audioUrl,
		backgroundImageUrl: songData.imageUrl, // Use imageUrl instead of backgroundImageUrl
		bpm: songData.bpm || 120, // BPM is on songData, not chartData
		lanes: chartData.lanes,
		hitObjects
	};

	// Get current preferences for game configuration
	const prefs = Preferences.prefs;

	// Create the main game renderer with proper PlayfieldSizer integration
	const playfieldDesignWidth = computed(parentElementRect, (el) => el.width);
	const playfieldDesignHeight = computed(parentElementRect, (el) => el.height * 0.925);
	const laneWidth = atom(80);
	const highwayHeight = playfieldDesignHeight;
	const receptorY = computed(highwayHeight, (h) => h * 0.775);

	const rendererConfig = {
		playfieldSizing: {
			playfieldDesignWidth: playfieldDesignWidth,
			playfieldDesignHeight: playfieldDesignHeight,
			targetAspectRatio: 1,
			// osu!mania inspired scaling parameters
			portraitBaseScale: 1.25, // Scale up by 25% for mobile playability
			portraitSideGap: 0.9, // Leave 10% horizontal gap
			landscapeTargetWidth: 1024,
			landscapeTargetHeight: 768,
		},
		playfield: {
			numLanes: chartData.lanes,
			highway: {
				laneWidth: laneWidth,
				highwayWidth: computed(laneWidth, (laneWidth) => laneWidth * chartData.lanes),
				highwayHeight: highwayHeight,
				x: 0,
				y: 0,
				fillColor: 0x111111,
				borderColor: 0x666666,
				borderThickness: 2,
				laneSeparatorColor: 0x444444,
				laneSeparatorThickness: 1,
			},
			receptors: {
				laneWidth: laneWidth,
				receptorHeight: 50,
				yPosition: receptorY,
				highwayX: 0,
				baseColor: 0x888888,
				activeColor: 0xffffff,
				outlineColor: 0xaaaaaa,
				outlineThickness: 2,
			},
			notes: {
				laneWidth: laneWidth,
				noteWidthRatio: 0.8,
				laneColors: [0x00ff00, 0x0000ff, 0xff0000, 0xffff00, 0xff00ff, 0x00ffff],
				hitZoneY: receptorY,
				receptorYPosition: receptorY,
				scrollSpeed: 400,
				canvasHeight: playfieldDesignHeight,
				highwayX: 0,
			},
		},
		progressBar: {
			screenWidth: computed(parentElementRect, (el) => el.width),
			screenHeight: computed(parentElementRect, (el) => el.height),
			height: 6,
			// Position progress bar in the bottom 10% area in landscape mode
			yPosition: computed(parentElementRect, (el) => el.width > el.height
				? el.height * 0.9 // Landscape: start of bottom 10%
				: undefined), // Portrait: use default (bottom of screen)
			backgroundColor: 0x000000,
			backgroundAlpha: 0.4,
			progressColor: 0x00ff88,
			progressAlpha: 0.8,
			borderColor: 0x666666,
			borderThickness: 1,
		},
		background: {
			imageUrl: song.backgroundImageUrl,
			dimAmount: 0.3,
			backgroundColor: 0x111111, // Fallback color
		},
		screenWidth: computed(parentElementRect, (el) => el.width),
		screenHeight: computed(parentElementRect, (el) => el.height),
		numLanes: chartData.lanes,
	};

	const screenWidth = computed(parentElementRect, (el) => el.width);
	const screenHeight = computed(parentElementRect, (el) => el.height);
	const renderer = new MainGameRenderer(app, screenWidth, screenHeight, song);

	// Create the game adapter with configuration from preferences
	const gameAdapter = new WebGameAdapter({
		onPhaseChange: (phase) => {
			callbacks.onPhaseChange(phase);
		},
		onCountdownUpdate: callbacks.onCountdownUpdate,
		onScoreUpdate: (playerId, score, combo, accuracy) => {
			// Convert from per-player format to legacy format
			// For now, we assume single player and calculate maxCombo from current combo
			const maxCombo = Math.max(combo, 0); // This will need to be tracked properly
			callbacks.onScoreUpdate(score, combo, maxCombo);
			// Update renderer
			renderer.updateScore(score);
			renderer.updateCombo(combo);
		},
		onNoteHit: (noteId, judgment, score) => {
			// Find the note to get its lane for compatibility
			const note = hitObjects.find(ho => ho.timeMs === noteId); // This is a temporary workaround
			callbacks.onNoteHit(noteId, judgment, score, note?.lane);
			// Update renderer
			if (note) {
				renderer.removeNote(noteId);
				setReceptorActive(note.lane, true);
				// Deactivate receptor after a short delay
				setTimeout(() => setReceptorActive(note.lane, false), 100);
			}
		},
		onNoteMiss: (noteId) => {
			// Find the note to get its lane for compatibility
			const note = hitObjects.find(ho => ho.timeMs === noteId); // This is a temporary workaround
			callbacks.onNoteMiss(noteId, note?.lane);
		},
		onTimeUpdate: callbacks.onTimeUpdate,
		onSongEnd: () => {
			callbacks.onSongEnd();
		},
		onSongLoaded: () => {
			console.log('Song loaded successfully');
			// Note: We'll get notes from the game adapter's getNotesForRendering() method
			// during the render loop instead of adding them manually here
		},
		onSongLoadError: (error) => {
			console.error('Failed to load song:', error);
		}
	}, {
		gameConfig: {
			keybindings: prefs.gameplay.keybindings,
			countdownSeconds: 3,
			timing: {
				perfectWindowMs: prefs.gameplay.perfectWindowMs || 30,
				excellentWindowMs: prefs.gameplay.excellentWindowMs || 60,
				goodWindowMs: prefs.gameplay.goodWindowMs || 90,
				mehWindowMs: prefs.gameplay.mehWindowMs || 150
			}
		},
		renderer: renderer, // Pass the renderer to the game adapter
		songDurationMs: Math.max(...hitObjects.map(ho => ho.timeMs), 0) + 2000 // Song duration for progress bar
	});

	// Initialize the game
	await gameAdapter.initializeChart(song);
	await gameAdapter.loadSong(songData.audioUrl);

	// Return the simplified interface
	return {
		startGameplay: () => {
			gameAdapter.startGameplay();
		},

		pauseGame: () => {
			gameAdapter.pause();
		},

		resumeGame: () => {
			gameAdapter.resume();
		},

		handleKeyPress: (key: string, event: KeyboardEvent) => {
			console.log(`[GameEngine] Handling key press for key: ${key}`);
			// Get the lane from the core engine, which knows the keybindings.
			const lane = gameAdapter.gameEngine.getLaneForKey(key);

			// Visual feedback should always happen.
			if (lane !== -1) {
				setReceptorActive(lane, true);
			}

			// Gameplay logic should only happen if the game is in the 'playing' phase.
			if (gameAdapter.getGameplayPhase() === 'playing') {
				gameAdapter.handleKeyPress(key);
			}
		},

		handleKeyRelease: (key: string, event: KeyboardEvent) => {
			// Get the lane from the core engine.
			const lane = gameAdapter.gameEngine.getLaneForKey(key);

			// Visual feedback should always happen.
			if (lane !== -1) {
				setReceptorActive(lane, false);
			}

			// Gameplay logic should only happen if the game is in the 'playing' phase.
			if (gameAdapter.getGameplayPhase() === 'playing') {
				gameAdapter.handleKeyRelease(key);
			}
		},

		cleanup: () => {
			gameAdapter.cleanup();
			renderer.destroy();
			app.destroy(false); // Don't remove canvas since it's managed by Svelte
		},

		getCurrentPhase: () => {
			return gameAdapter.getGameplayPhase();
		},

		isPaused: () => {
			return gameAdapter.isPaused();
		},

		getCurrentSongTimeMs: () => {
			return gameAdapter.getCurrentSongTimeMs();
		},

		getNotesForRendering: () => {
			return gameAdapter.getNotesForRendering();
		},

		getPlayerStates: () => {
			return gameAdapter.getPlayerStates();
		},

		// Rendering methods
		getCanvas: () => {
			return canvas;
		},

		handleResize: () => {
			const parentElementRect = parentElement.getBoundingClientRect();
			app.renderer.resize(parentElementRect.width, parentElementRect.height);

			// const isLandscape = parentElementRect.width > parentElementRect.height;
			// const progressBarConfig = {
			// 	screenWidth: parentElementRect.width,
			// 	screenHeight: parentElementRect.height,
			// 	height: 6,
			// 	yPosition: isLandscape
			// 		? parentElementRect.height * 0.9 // Landscape: start of bottom 10%
			// 		: undefined, // Portrait: use default (bottom of screen)
			// 	backgroundColor: 0x000000,
			// 	backgroundAlpha: 0.4,
			// 	progressColor: 0x00ff88,
			// 	progressAlpha: 0.8,
			// 	borderColor: 0x666666,
			// 	borderThickness: 1,
			// };

			

			// Update renderer with new configurations
			// renderer.updateProgressBarConfig(progressBarConfig);
		},

		// Legacy compatibility methods

		getHighwayMetrics: () => {
			// This method is not available in the new game engine
			// as rendering is separated from game logic
			console.warn('getHighwayMetrics called - not available with new game engine');
			return null;
		}
	};
} 