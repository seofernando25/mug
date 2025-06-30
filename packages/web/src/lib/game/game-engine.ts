import { Preferences } from '$lib/preferences';
import type { orpcClient } from '$lib/rpc-client';
import { WebGame, type GameplaySong, type HitObject } from 'game-engine';
import { atom, computed } from 'nanostores';

// Re-export the GamePhase from game-engine for compatibility

export interface GameEngineCallbacks {
	onCountdownUpdate: (value: number) => void;
	onSongEnd: () => void;
	onScoreUpdate: (score: number, combo: number, maxCombo: number) => void;
	onNoteHit: (noteId: number, judgment: string, score: number, lane?: number) => void;
	onNoteMiss: (noteId: number, lane?: number) => void;
	onTimeUpdate?: (currentTimeMs: number) => void;
}



/**
 * Create a new game instance using the game-engine WebGame
 * This replaces the old complex createGame function with a much simpler implementation
 */
export async function createGameEngine(
	songData: Awaited<ReturnType<typeof orpcClient.song.get>>,
	chartData: Awaited<ReturnType<typeof orpcClient.song.get>>['charts'][0],
	canvas: HTMLCanvasElement,
	callbacks: GameEngineCallbacks
): Promise<WebGame> {

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



	// Create the game adapter with configuration from preferences
	const webgame = new WebGame({
		canvas: canvas,
		resizeTo: parentElement,
	}, {
		onCountdownUpdate: callbacks.onCountdownUpdate,
		onScoreUpdate: (playerId, score, combo, accuracy) => {
			// Convert from per-player format to legacy format
			// For now, we assume single player and calculate maxCombo from current combo
			const maxCombo = Math.max(combo, 0); // This will need to be tracked properly
			callbacks.onScoreUpdate(score, combo, maxCombo);
			// Update renderer
			// renderer.updateScore(score);
			// renderer.updateCombo(combo);
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
		// renderer: renderer, // Pass the renderer to the game adapter
		songDurationMs: Math.max(...hitObjects.map(ho => ho.timeMs), 0) + 2000 // Song duration for progress bar
	});

	// Initialize the game
	webgame.currentSong.set(song);
	await webgame.initializeChart(song);
	await webgame.loadSong(songData.audioUrl);

	const handleKeyDown = (event: KeyboardEvent) => {
		console.log(`[GameEngine] Handling key press for key: ${event.key}`);
		webgame.handleKeyPress(event.key.toLowerCase());
	};

	const handleKeyUp = (event: KeyboardEvent) => {
		webgame.handleKeyRelease(event.key.toLowerCase());
	};

	window.addEventListener("keydown", handleKeyDown);
	window.addEventListener("keyup", handleKeyUp);


	webgame.oncleanup.push(() => {
		window.removeEventListener("keydown", handleKeyDown);
		window.removeEventListener("keyup", handleKeyUp);
	});

	return webgame;
} 