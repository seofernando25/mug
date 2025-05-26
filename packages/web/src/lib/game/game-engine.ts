import { WebGameAdapter, type GameplaySong, type HitObject } from 'game-engine';
import type { orpcClient } from '$lib/rpc-client';
import { Preferences } from '$lib/preferences';
import { get } from 'svelte/store';

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
	// Legacy compatibility methods
	handleResize?: () => void;
	getHighwayMetrics?: () => any;
}

/**
 * Create a new game instance using the game-engine WebGameAdapter
 * This replaces the old complex createGame function with a much simpler implementation
 */
export async function createGameEngine(
	songData: Awaited<ReturnType<typeof orpcClient.song.get>>,
	chartData: Awaited<ReturnType<typeof orpcClient.song.get>>['charts'][0],
	callbacks: GameEngineCallbacks
): Promise<GameEngineInstance> {

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

	// Create the game adapter with configuration from preferences
	const gameAdapter = new WebGameAdapter({
		onPhaseChange: callbacks.onPhaseChange,
		onCountdownUpdate: callbacks.onCountdownUpdate,
		onScoreUpdate: (playerId, score, combo, accuracy) => {
			// Convert from per-player format to legacy format
			// For now, we assume single player and calculate maxCombo from current combo
			const maxCombo = Math.max(combo, 0); // This will need to be tracked properly
			callbacks.onScoreUpdate(score, combo, maxCombo);
		},
		onNoteHit: (noteId, judgment, score) => {
			// Find the note to get its lane for compatibility
			const note = hitObjects.find(ho => ho.timeMs === noteId); // This is a temporary workaround
			callbacks.onNoteHit(noteId, judgment, score, note?.lane);
		},
		onNoteMiss: (noteId) => {
			// Find the note to get its lane for compatibility
			const note = hitObjects.find(ho => ho.timeMs === noteId); // This is a temporary workaround
			callbacks.onNoteMiss(noteId, note?.lane);
		},
		onTimeUpdate: callbacks.onTimeUpdate,
		onSongEnd: callbacks.onSongEnd,
		onSongLoaded: () => {
			console.log('Song loaded successfully');
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
			gameAdapter.cleanup();
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

		// Legacy compatibility methods

		handleResize: () => {
			// The new game engine doesn't need manual resize handling
			// as it doesn't manage PIXI.js directly
			console.log('handleResize called - not needed with new game engine');
		},

		getHighwayMetrics: () => {
			// This method is not available in the new game engine
			// as rendering is separated from game logic
			console.warn('getHighwayMetrics called - not available with new game engine');
			return null;
		}
	};
} 