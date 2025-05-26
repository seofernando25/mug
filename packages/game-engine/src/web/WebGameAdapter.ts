import { GameEngine, type GameEngineCallbacks, type GameEngineCorePhase } from '../core/GameEngine';
import { DEFAULT_CONFIG, type GameConfig } from '../config/GameConfig';
import type { GameplaySong } from '../types/ChartTypes';
import type { GamePhase } from '../core/GameState';

export interface WebGameCallbacks {
	onPhaseChange?: (phase: GamePhase) => void;
	onEngineCorePhaseChange?: (phase: GameEngineCorePhase) => void;
	onCountdownUpdate?: (count: number) => void;
	onScoreUpdate?: (playerId: string, score: number, combo: number, accuracy: number) => void;
	onNoteHit?: (noteId: number, judgment: string, score: number) => void;
	onNoteMiss?: (noteId: number) => void;
	onSongEnd?: () => void;
	onTimeUpdate?: (currentTimeMs: number) => void;
	onSongLoaded?: () => void;
	onSongLoadError?: (error: Error) => void;
}

export interface WebGameConfig {
	gameConfig?: Partial<GameConfig>;
	playerIds?: string[];
}

export class WebGameAdapter {
	private gameEngine: GameEngine;
	private callbacks: WebGameCallbacks;
	private isInitialized: boolean = false;
	private animationFrameId: number | null = null;

	constructor(callbacks: WebGameCallbacks = {}, config: WebGameConfig = {}) {
		this.callbacks = callbacks;

		// Merge provided config with defaults
		const gameConfig: GameConfig = {
			...DEFAULT_CONFIG,
			...config.gameConfig
		};

		// Create GameEngine callbacks that bridge to web callbacks
		const engineCallbacks: GameEngineCallbacks = {
			onEngineCorePhaseChange: this.callbacks.onEngineCorePhaseChange,
			onGameplaySystemPhaseChange: this.callbacks.onPhaseChange,
			onScoreUpdate: this.callbacks.onScoreUpdate,
			onNoteHit: this.callbacks.onNoteHit,
			onNoteMiss: this.callbacks.onNoteMiss,
			onGameplayCountdownUpdate: this.callbacks.onCountdownUpdate,
			onGameEnd: () => this.callbacks.onSongEnd?.(),
			onSongLoaded: this.callbacks.onSongLoaded,
			onSongLoadError: this.callbacks.onSongLoadError,
			onSongTimeUpdate: this.callbacks.onTimeUpdate,
			onAudioPlaybackStarted: () => {
				// Start the game loop when audio starts
				this.startGameLoop();
			},
			onAudioPlaybackEnded: () => {
				// Stop the game loop when audio ends
				this.stopGameLoop();
				this.callbacks.onSongEnd?.();
			}
		};

		this.gameEngine = new GameEngine(gameConfig, engineCallbacks);
	}

	// Initialize with chart data
	public async initializeChart(song: GameplaySong, playerIds: string[] = ['player1']): Promise<void> {
		this.gameEngine.initializeChart(song, playerIds);
		this.isInitialized = true;
	}

	// Load audio file
	public async loadSong(audioUrl: string): Promise<void> {
		if (!this.isInitialized) {
			throw new Error('Must call initializeChart() before loadSong()');
		}
		await this.gameEngine.loadSong(audioUrl);
	}

	// Start the gameplay sequence (countdown -> game)
	public startGameplay(): void {
		if (!this.isInitialized) {
			throw new Error('Must call initializeChart() and loadSong() before startGameplay()');
		}
		this.gameEngine.requestStartGameplaySequence();
	}

	// Input handling
	public handleKeyPress(key: string, playerId?: string): void {
		this.gameEngine.handleInput('press', key, playerId);
	}

	public handleKeyRelease(key: string, playerId?: string): void {
		this.gameEngine.handleInput('release', key, playerId);
	}

	// Game control
	public pause(): void {
		this.gameEngine.pauseAudio();
		this.stopGameLoop();
	}

	public resume(): void {
		this.gameEngine.resumeAudio();
		this.startGameLoop();
	}

	public stop(): void {
		this.gameEngine.stopAudio();
		this.stopGameLoop();
	}

	// State getters for rendering
	public getCurrentSongTimeMs(): number {
		return this.gameEngine.getCurrentSongTimeMs();
	}

	public getGameplayPhase(): GamePhase {
		return this.gameEngine.getGameplayPhase();
	}

	public getEngineCorePhase(): GameEngineCorePhase {
		return this.gameEngine.getEngineCorePhase();
	}

	public getPlayerStates(): Map<string, any> {
		return this.gameEngine.getPlayerStates();
	}

	public getNotesForRendering(): any[] {
		return this.gameEngine.getNotesForRendering();
	}

	public isPaused(): boolean {
		return this.gameEngine.isPaused();
	}

	// Game loop management
	private startGameLoop(): void {
		if (this.animationFrameId !== null) return; // Already running

		const gameLoop = (timestamp: number) => {
			this.gameEngine.update(timestamp);
			this.animationFrameId = requestAnimationFrame(gameLoop);
		};

		this.animationFrameId = requestAnimationFrame(gameLoop);
	}

	private stopGameLoop(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	// Cleanup
	public cleanup(): void {
		this.stopGameLoop();
		this.gameEngine.cleanup();
		this.isInitialized = false;
	}
} 