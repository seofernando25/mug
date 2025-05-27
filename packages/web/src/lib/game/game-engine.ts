import { Preferences } from '$lib/preferences';
import type { orpcClient } from '$lib/rpc-client';
import { initDevtools } from '@pixi/devtools';
import { MainGameRenderer, WebGameAdapter, type GameplayNote, type GameplaySong, type HitObject } from 'game-engine';
import * as PIXI from 'pixi.js';

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

	const parentElement = canvas.parentElement;
	if (!parentElement) {
		throw new Error('Canvas parent element not found');
	}

	const parentElementRect = parentElement.getBoundingClientRect();

	// Create PIXI Application with the provided canvas
	const app = new PIXI.Application();
	setTimeout(() => {
		initDevtools({ app });
	}, 1000);
	await app.init({
		canvas: canvas,
		width: parentElementRect.width,
		height: parentElementRect.height,
		backgroundColor: 0x000000,
		antialias: true,
		resolution: window.devicePixelRatio || 1,
		autoDensity: true,
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
	const playfieldDesignWidth = parentElementRect.width; // Design width for the playfield
	const playfieldDesignHeight = parentElementRect.height * 0.925; // Design height for the playfield
	const laneWidth = 80;
	const highwayHeight = playfieldDesignHeight; // 80% of design height for highway
	const receptorY = highwayHeight * 0.775
		; // Receptors at 80% down the highway

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
				highwayWidth: laneWidth * chartData.lanes,
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
				canvasWidth: playfieldDesignWidth,
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
			screenWidth: parentElementRect.width,
			screenHeight: parentElementRect.height,
			height: 6,
			// Position progress bar in the bottom 10% area in landscape mode
			yPosition: parentElementRect.width > parentElementRect.height
				? parentElementRect.height * 0.9 // Landscape: start of bottom 10%
				: undefined, // Portrait: use default (bottom of screen)
			backgroundColor: 0x000000,
			backgroundAlpha: 0.4,
			progressColor: 0x00ff88,
			progressAlpha: 0.8,
			borderColor: 0x666666,
			borderThickness: 1,
		},
		background: {
			screenWidth: parentElementRect.width,
			screenHeight: parentElementRect.height,
			imageUrl: song.backgroundImageUrl,
			dimAmount: 0.3,
			backgroundColor: 0x111111, // Fallback color
		},
		screenWidth: parentElementRect.width,
		screenHeight: parentElementRect.height,
		numLanes: chartData.lanes,
	};

	const renderer = new MainGameRenderer(app, rendererConfig);

	// Game loop for rendering updates
	let animationFrameId: number | null = null;
	let addedNotes = new Set<number>();

	const startRenderLoop = () => {
		if (animationFrameId !== null) return;

		const renderLoop = () => {
			const currentTime = gameAdapter.getCurrentSongTimeMs();

			// Get notes that should be visible and add them to renderer
			const notesToRender = gameAdapter.getNotesForRendering();
			notesToRender.forEach((note: GameplayNote) => {
				if (!addedNotes.has(note.id)) {
					renderer.addNote(note);
					addedNotes.add(note.id);
				}
			});

			// Update progress bar based on song time
			// Calculate progress as currentTime / songDuration
			// We'll estimate song duration from the last note's time + some buffer
			const lastNoteTime = Math.max(...hitObjects.map(ho => ho.timeMs), 0);
			const songDuration = lastNoteTime + 2000; // Add 2 seconds buffer after last note
			const progress = songDuration > 0 ? Math.min(currentTime / songDuration, 1) : 0;
			renderer.updateProgress(progress);

			renderer.update(currentTime);
			animationFrameId = requestAnimationFrame(renderLoop);
		};

		animationFrameId = requestAnimationFrame(renderLoop);
	};

	const stopRenderLoop = () => {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	};

	// Create the game adapter with configuration from preferences
	const gameAdapter = new WebGameAdapter({
		onPhaseChange: (phase) => {
			callbacks.onPhaseChange(phase);
			// Start/stop rendering based on phase
			if (phase === 'playing' || phase === 'countdown') {
				startRenderLoop();
			} else {
				stopRenderLoop();
			}
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
				renderer.activateReceptor(note.lane);
				// Deactivate receptor after a short delay
				setTimeout(() => renderer.deactivateReceptor(note.lane), 100);
			}
		},
		onNoteMiss: (noteId) => {
			// Find the note to get its lane for compatibility
			const note = hitObjects.find(ho => ho.timeMs === noteId); // This is a temporary workaround
			callbacks.onNoteMiss(noteId, note?.lane);
			// Update renderer
			renderer.removeNote(noteId);
		},
		onTimeUpdate: callbacks.onTimeUpdate,
		onSongEnd: () => {
			stopRenderLoop();
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
		}
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
			gameAdapter.handleKeyPress(key);
		},

		handleKeyRelease: (key: string, event: KeyboardEvent) => {
			gameAdapter.handleKeyRelease(key);
		},

		cleanup: () => {
			stopRenderLoop();
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

			// Resize PIXI application
			app.renderer.resize(parentElementRect.width, parentElementRect.height);

			// Update progress bar configuration for new screen size and orientation
			const isLandscape = parentElementRect.width > parentElementRect.height;
			const progressBarConfig = {
				screenWidth: parentElementRect.width,
				screenHeight: parentElementRect.height,
				height: 6,
				yPosition: isLandscape
					? parentElementRect.height * 0.9 // Landscape: start of bottom 10%
					: undefined, // Portrait: use default (bottom of screen)
				backgroundColor: 0x000000,
				backgroundAlpha: 0.4,
				progressColor: 0x00ff88,
				progressAlpha: 0.8,
				borderColor: 0x666666,
				borderThickness: 1,
			};

			// Update background configuration for new screen size
			const backgroundConfig = {
				screenWidth: parentElementRect.width,
				screenHeight: parentElementRect.height,
				imageUrl: song.backgroundImageUrl,
				dimAmount: 0.3,
				backgroundColor: 0x111111,
			};

			// Update renderer with new configurations
			renderer.onResize(parentElementRect.width, parentElementRect.height);
			renderer.updateProgressBarConfig(progressBarConfig);
			renderer.updateBackgroundConfig(backgroundConfig);
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