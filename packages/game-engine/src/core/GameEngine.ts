import * as PIXISound from '@pixi/sound';
import type { GameConfig } from '../config/GameConfig';
import { GameplayManager, type GameplayCallbacks } from '../gameplay/GameplayManager';
import type { GameplaySong } from '../types/ChartTypes';
import { EventQueue } from './EventQueue';
import { GameStateManager, type GamePhase as GameplaySystemPhase } from './GameState';

// Core Engine Phases - distinct from GameplaySystemPhase
export type GameEngineCorePhase =
	| 'idle' // Initial state
	| 'loading_chart'
	| 'loading_song'
	| 'song_load_error'
	| 'ready' // Chart and song loaded, ready for gameplay sequence to start
	| 'countdown_internal' // If engine manages its own visual countdown
	| 'audio_playing'
	| 'audio_paused'
	| 'audio_ended'
	| 'error';

export interface GameEngineCallbacks {
	// Renamed phase change to be specific to the core engine's perspective
	onEngineCorePhaseChange?: (phase: GameEngineCorePhase) => void;
	onGameplaySystemPhaseChange?: (phase: GameplaySystemPhase) => void; // For phases from GameplayManager/GameStateManager

	onScoreUpdate?: (playerId: string, score: number, combo: number, accuracy: number) => void;
	onNoteHit?: (noteId: number, judgment: string, score: number) => void;
	onNoteMiss?: (noteId: number) => void;

	// Countdown from GameplayManager (if it handles it)
	onGameplayCountdownUpdate?: (count: number) => void;
	onGameEnd?: (results: Map<string, any>) => void; // This likely comes from GameplayManager

	// New audio related callbacks
	onSongLoaded?: () => void;
	onSongLoadError?: (error: Error) => void;
	onSongTimeUpdate?: (currentTimeMs: number) => void;
	onAudioPlaybackStarted?: () => void;
	onAudioPlaybackEnded?: () => void;
}

export class GameEngine {
	private eventQueue: EventQueue;
	private gameStateManager: GameStateManager; // Manages gameplay-related state and phase
	private callbacks: GameEngineCallbacks;

	private gameplayManager: GameplayManager;

	// Audio members
	private sound: PIXISound.Sound | null = null;
	private soundInstance: PIXISound.IMediaInstance | null = null;
	private audioUrl: string | null = null;
	private authoritativeAudioTimeMs: number = 0;
	private systemTimeAtLastAudioUpdate: number = 0;
	private internalCurrentSongTimeMs: number = 0;
	private audioLoaded: boolean = false;
	private audioError: Error | null = null;
	private audioPlaybackManuallyStarted: boolean = false;

	private engineCorePhase: GameEngineCorePhase = 'idle';
	private isRunningGameplayLoop: boolean = false; // Controls the game logic update pump

	constructor(config: GameConfig, callbacks: GameEngineCallbacks = {}) {
		this.callbacks = callbacks;

		this.eventQueue = new EventQueue();
		this.gameStateManager = new GameStateManager(); // Gameplay state and phase (e.g. playing, paused, summary)

		const gameplayCallbacks: GameplayCallbacks = {
			onNoteHit: this.callbacks.onNoteHit ? (noteId, judgment, score, _playerId) => {
				// The judgment object from GameplayManager has type and timingOffset
				this.callbacks.onNoteHit!(noteId, judgment.type, score);
			} : undefined,
			onNoteMiss: this.callbacks.onNoteMiss,
			onScoreUpdate: this.callbacks.onScoreUpdate,
			// GameplayManager can have its own phase changes
			onPhaseChange: this.callbacks.onGameplaySystemPhaseChange,
			onCountdownUpdate: this.callbacks.onGameplayCountdownUpdate,
			onAllNotesJudged: () => { // New callback from GameplayManager
				// This means gameplay is over from note perspective. Audio might still play.
				console.log("GameplayManager: All notes judged.");
				// GameEngine can decide what to do next, e.g. wait for audio to end or transition phase
			},
			onRequestStopAudio: () => { // New callback from GameplayManager
				this.stopAudio();
			},
			onRequestStartAudio: () => { // New callback from GameplayManager
				if (this.engineCorePhase === 'ready' || this.engineCorePhase === 'countdown_internal') {
					this.startAudioPlayback();
				} else {
					console.warn(`GameplayManager requested start audio, but engineCorePhase is ${this.engineCorePhase}`);
				}
			}
		};
		this.gameplayManager = new GameplayManager(config, gameplayCallbacks, this.gameStateManager);

		this.setEngineCorePhase('idle');
		this.setupEventHandlers(); // Core engine events, not gameplay ones directly
	}

	private setEngineCorePhase(phase: GameEngineCorePhase): void {
		if (this.engineCorePhase === phase) return;
		this.engineCorePhase = phase;
		this.callbacks.onEngineCorePhaseChange?.(phase);
		console.log(`GameEngine Core Phase: ${phase}`);
	}

	private setupEventHandlers(): void {
		// Core engine events, e.g., for pause/resume triggered externally to GameEngine
		this.eventQueue.on('coreEnginePause', () => this.pauseAudio());
		this.eventQueue.on('coreEngineResume', () => this.resumeAudio());
		// Other core system events can be added here
	}

	// Step 1: Consumer loads chart data into the engine
	public initializeChart(song: GameplaySong, playerIds: string[]): void {
		this.setEngineCorePhase('loading_chart');
		this.gameStateManager.initializeGame(song, playerIds, false, playerIds[0]); // Assuming solo for now
		this.gameplayManager.initializePlayers(playerIds);
		this.gameplayManager.loadNotes(song.hitObjects); // GameplayManager needs the notes
		// Consider if GameStateManager also needs all notes directly or if GameplayManager is the source of truth
		this.setEngineCorePhase('ready'); // Ready for song loading
	}

	// Step 2: Consumer loads the audio file
	public async loadSong(audioUrl: string): Promise<void> {
		if (this.engineCorePhase !== 'ready' && this.engineCorePhase !== 'song_load_error') {
			console.warn(`Cannot load song in current engine phase: ${this.engineCorePhase}. Initialize chart first.`);
			return Promise.reject(new Error(`Cannot load song in current engine phase: ${this.engineCorePhase}`));
		}
		this.setEngineCorePhase('loading_song');
		this.audioUrl = audioUrl;
		this.audioLoaded = false;
		this.audioError = null;
		this.sound?.destroy(); // Clean up previous sound if any
		this.sound = null;
		this.soundInstance?.destroy();
		this.soundInstance = null;

		try {
			this.sound = PIXISound.Sound.from({
				url: this.audioUrl,
				preload: true,
				singleInstance: true, // Important for typical music tracks
			});

			await new Promise<void>((resolve, _reject) => {
				if (this.sound!.isLoaded) {
					resolve();
					return;
				}
				// @pixi/sound doesn't have 'once' method, we need to handle loading differently
				const checkLoaded = () => {
					if (this.sound!.isLoaded) {
						resolve();
					} else {
						// Check again in next frame
						setTimeout(checkLoaded, 10);
					}
				};
				checkLoaded();
			});

			this.audioLoaded = true;
			console.log(`Audio loaded: ${this.audioUrl}`);
			this.setEngineCorePhase('ready'); // Back to ready, meaning chart & song are loaded
			this.callbacks.onSongLoaded?.();
		} catch (error) {
			console.error(`Error loading audio: ${this.audioUrl}`, error);
			this.audioError = error as Error;
			this.setEngineCorePhase('song_load_error');
			this.callbacks.onSongLoadError?.(this.audioError);
			throw error; // Re-throw for the caller
		}
	}

	// Step 3: Consumer tells the engine to start the gameplay sequence (e.g., countdown)
	public requestStartGameplaySequence(): void {
		if (this.engineCorePhase !== 'ready') {
			console.warn(`Engine not ready to start gameplay sequence. Current phase: ${this.engineCorePhase}`);
			return;
		}
		if (!this.audioLoaded) {
			console.error("Audio not loaded. Cannot start gameplay sequence.");
			this.setEngineCorePhase('song_load_error'); // Or some other error state
			return;
		}

		// Tell GameplayManager to start its process (e.g., countdown)
		// GameplayManager will eventually call back via onRequestStartAudio
		this.gameplayManager.startPreparation(); // e.g., starts countdown
		// Engine might enter an internal "waiting_for_gameplay_ready" phase or use GameplayManager's phase
		// For now, let GameplayManager handle its own countdown phase via its callbacks.
		// The GameEngine's isRunningGameplayLoop will be set true when audio actually starts.
	}

	// Main game loop update method
	public update(systemCurrentTime: number): void {

		if (!this.isRunningGameplayLoop && this.engineCorePhase !== 'audio_playing' && this.engineCorePhase !== 'audio_paused') {
			// If not actively playing/paused, only minimal updates
			this.eventQueue.processEvents(this.internalCurrentSongTimeMs);
			return;
		}

		// Calculate current song time with audio synchronization
		if (this.engineCorePhase === 'audio_playing') {
			// Use audio time as authoritative source, but smooth with system time
			const systemTimeSinceLastAudioUpdate = systemCurrentTime - this.systemTimeAtLastAudioUpdate;

			// If we haven't received an audio update in a while, fall back to system time progression
			if (systemTimeSinceLastAudioUpdate < 100) { // 100ms threshold
				this.internalCurrentSongTimeMs = this.authoritativeAudioTimeMs;
			} else {
				// Smooth progression using system time
				this.internalCurrentSongTimeMs = this.authoritativeAudioTimeMs + systemTimeSinceLastAudioUpdate;
			}
		}
		// For paused state, keep the current time static

		// Process core engine events
		this.eventQueue.processEvents(this.internalCurrentSongTimeMs);

		// Update gameplay logic
		this.gameplayManager.update(this.internalCurrentSongTimeMs);

		// Notify callbacks of time updates
		this.callbacks.onSongTimeUpdate?.(this.internalCurrentSongTimeMs);
	}

	// Placeholder for audio control methods
	public startAudioPlayback(): void {
		if (!this.audioLoaded || !this.sound) {
			console.error("Cannot start audio playback: Sound not loaded.");
			return;
		}
		if (this.soundInstance && !this.soundInstance.paused) {
			console.log("Audio is already playing.");
			return;
		}

		this.soundInstance = this.sound.play() as PIXISound.IMediaInstance; // Assuming play() returns IMediaInstance or Promise<IMediaInstance>

		if (!this.soundInstance) {
			console.error("Failed to get sound instance from play().");
			this.setEngineCorePhase('error'); // Or a specific audio error phase
			return;
		}

		this.audioPlaybackManuallyStarted = true;
		this.authoritativeAudioTimeMs = 0;
		this.internalCurrentSongTimeMs = 0; // Reset time when playback starts
		this.systemTimeAtLastAudioUpdate = performance.now();
		this.isRunningGameplayLoop = true; // Start the main game loop updates
		this.setEngineCorePhase('audio_playing');
		this.callbacks.onAudioPlaybackStarted?.();

		this.soundInstance.on('progress', (progress: number, duration: number) => {
			this.authoritativeAudioTimeMs = progress * duration * 1000;
			this.systemTimeAtLastAudioUpdate = performance.now();
		});

		this.soundInstance.on('end', () => {
			console.log("Audio playback ended.");
			this.isRunningGameplayLoop = false;
			this.setEngineCorePhase('audio_ended');
			this.callbacks.onAudioPlaybackEnded?.();
			this.gameplayManager.notifySongEnded(); // Inform GameplayManager
		});

		// Note: @pixi/sound IMediaInstance doesn't support 'error' events
		// Error handling would need to be done at the Sound level or through other means
	}

	public pauseAudio(): void {
		if (this.engineCorePhase === 'audio_playing' && this.sound) {
			this.sound.pause();
			this.isRunningGameplayLoop = false; // Stop pumping gameplay updates
			this.setEngineCorePhase('audio_paused');
			console.log("Audio paused");
		}
	}

	public resumeAudio(): void {
		if (this.engineCorePhase === 'audio_paused' && this.sound) {
			this.sound.resume();
			this.isRunningGameplayLoop = true; // Resume pumping gameplay updates
			this.systemTimeAtLastAudioUpdate = performance.now(); // Also reset for audio sync
			this.setEngineCorePhase('audio_playing');
			console.log("Audio resumed");
		}
	}

	public stopAudio(): void {
		if (this.soundInstance) {
			this.soundInstance.stop();
			// soundInstance listeners should be removed or instance destroyed if not reusing
			// For singleInstance, destroying soundInstance might not be necessary if sound object is kept.
			// Let's assume stop() is enough and 'end' event will fire or we handle state change.
		}
		this.isRunningGameplayLoop = false;
		if (this.audioPlaybackManuallyStarted) { // Only set to audio_ended if we actually started it.
			this.setEngineCorePhase(this.engineCorePhase === 'error' ? 'error' : 'audio_ended'); // Preserve error state
		}
		this.internalCurrentSongTimeMs = 0; // Or set to actual duration if needed
		this.authoritativeAudioTimeMs = 0;
		this.audioPlaybackManuallyStarted = false;
	}

	// Expose core engine phase
	public getEngineCorePhase(): GameEngineCorePhase {
		return this.engineCorePhase;
	}

	// Get current song time
	public getCurrentSongTimeMs(): number {
		return this.internalCurrentSongTimeMs;
	}

	// Get current gameplay phase from GameplayManager
	public getGameplayPhase(): GameplaySystemPhase {
		return this.gameStateManager.getPhase();
	}

	// Get player states for rendering
	public getPlayerStates(): Map<string, any> {
		return this.gameplayManager.getAllPlayerStates();
	}

	// Get notes for rendering (with current states)
	public getNotesForRendering(): any[] {
		return this.gameStateManager.getAllNotes();
	}

	// Check if game is paused
	public isPaused(): boolean {
		return this.engineCorePhase === 'audio_paused';
	}

	// Input handling - now primarily forwards to GameplayManager if conditions are met
	public handleInput(type: 'press' | 'release', key: string, playerId?: string): void {
		// Only pass input if gameplay is active from the engine's perspective
		if (this.engineCorePhase === 'audio_playing' && this.isRunningGameplayLoop) {
			// GameplayManager will use its own phase and current time to decide if input is valid
			this.gameplayManager.processInput(type, key, this.internalCurrentSongTimeMs, playerId);
		}
	}

	// Cleanup
	public cleanup(): void {
		console.log("GameEngine: Cleaning up...");
		this.stopAudio(); // Ensure audio is stopped and listeners potentially unbound by stop/end events

		if (this.soundInstance) {
			// Manually remove listeners if not automatically handled by PIXISound on stop/destroy
			this.soundInstance.off('progress');
			this.soundInstance.off('end');
			// Note: 'error' event is not supported by IMediaInstance
			this.soundInstance.destroy(); // Destroy the instance
			this.soundInstance = null;
		}
		if (this.sound) {
			this.sound.destroy(); // Destroy the sound object itself
			this.sound = null;
		}

		this.isRunningGameplayLoop = false;
		// Clear event queue if it holds core engine events
		this.eventQueue.clear();
		this.eventQueue.clearHandlers();

		this.gameStateManager.cleanup(); // Gameplay related state
		this.gameplayManager.cleanup(); // Gameplay logic cleanup

		this.setEngineCorePhase('idle');
	}

	// Old methods like "startGame" (the one that started countdown and then game)
	// "pause", "resume" (the gameplay ones) are now effectively replaced.
	// External calls will be to requestStartGameplaySequence, pauseAudio, resumeAudio.
	// The internal game logic (countdown, actual start of note processing)
	// is now orchestrated more by GameplayManager, reacting to engine state and time.

	// The old handleKeyPress, handleKeyRelease are effectively replaced by processInput in GameplayManager.
	// The old handleGameStart, handleGamePause, handleGameResume, handleGameEnd are now driven by
	// a combination of engineCorePhase changes and GameplayManager's internal logic and its callbacks.
	// The old handleCountdown is now GameplayManager's responsibility, signaling through onGameplayCountdownUpdate.
	// The old handleNoteHit, handleNoteMiss are direct pass-throughs from GameplayManager's callbacks.
} 