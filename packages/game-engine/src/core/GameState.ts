import type { GameplaySong } from '../types/ChartTypes';
import type { GameplayNote, NoteState } from '../types/NoteTypes';
import { createInitialNoteState as createState } from '../types/NoteTypes';

export type GamePhase = 'idle' | 'loading' | 'countdown' | 'playing' | 'paused' | 'finished';

export interface PlayerState {
	id: string;
	score: number;
	combo: number;
	maxCombo: number;
	accuracy: number;
	totalNotes: number;
	hitNotes: number;
	missedNotes: number;
}

export interface GameState {
	phase: GamePhase;
	song: GameplaySong | null;
	players: Map<string, PlayerState>;
	notes: Map<number, GameplayNote>; // noteId -> note with current state
	currentTime: number; // Current game time in milliseconds
	startTime: number; // When the game actually started
	pausedTime: number; // Total time spent paused
	countdownValue: number; // Current countdown value (3, 2, 1, 0)

	// Multiplayer sync
	isMultiplayer: boolean;
	hostPlayerId?: string;
	syncedTime: number; // Authoritative time for multiplayer
}

export class GameStateManager {
	private state: GameState;

	constructor() {
		this.state = this.createInitialState();
	}

	private createInitialState(): GameState {
		return {
			phase: 'idle',
			song: null,
			players: new Map(),
			notes: new Map(),
			currentTime: 0,
			startTime: 0,
			pausedTime: 0,
			countdownValue: 0,
			isMultiplayer: false,
			syncedTime: 0
		};
	}

	// Get current state (read-only)
	getState(): Readonly<GameState> {
		return { ...this.state };
	}

	// Initialize game with song data
	initializeGame(song: GameplaySong, playerIds: string[], isMultiplayer: boolean = false, hostPlayerId?: string): void {
		this.state.phase = 'loading';
		this.state.song = song;
		this.state.isMultiplayer = isMultiplayer;
		this.state.hostPlayerId = hostPlayerId;

		// Initialize players
		this.state.players.clear();
		playerIds.forEach(playerId => {
			this.state.players.set(playerId, this.createInitialPlayerState(playerId));
		});

		// Initialize notes with waiting state
		this.state.notes.clear();
		song.hitObjects.forEach((hitObject, index) => {
			const noteId = index; // Use index as ID for now
			const gameplayNote: GameplayNote = {
				...hitObject,
				id: noteId,
				noteState: createState(hitObject.noteInfo)
			};
			this.state.notes.set(noteId, gameplayNote);
		});
	}

	private createInitialPlayerState(playerId: string): PlayerState {
		return {
			id: playerId,
			score: 0,
			combo: 0,
			maxCombo: 0,
			accuracy: 100,
			totalNotes: this.state.song?.hitObjects.length || 0,
			hitNotes: 0,
			missedNotes: 0
		};
	}

	// Phase management
	setPhase(phase: GamePhase): void {
		this.state.phase = phase;
	}

	getPhase(): GamePhase {
		return this.state.phase;
	}

	// Time management
	updateTime(currentTime: number): void {
		this.state.currentTime = currentTime;
	}

	setStartTime(startTime: number): void {
		this.state.startTime = startTime;
	}

	addPausedTime(pauseTime: number): void {
		this.state.pausedTime += pauseTime;
	}

	getGameTime(): number {
		return this.state.currentTime - this.state.startTime - this.state.pausedTime;
	}

	// Countdown management
	setCountdownValue(value: number): void {
		this.state.countdownValue = value;
	}

	getCountdownValue(): number {
		return this.state.countdownValue;
	}

	// Note state management
	updateNoteState(noteId: number, newState: NoteState): void {
		const note = this.state.notes.get(noteId);
		if (note) {
			note.noteState = newState;
		}
	}

	getNoteState(noteId: number): NoteState | null {
		const note = this.state.notes.get(noteId);
		return note ? note.noteState : null;
	}

	getNote(noteId: number): GameplayNote | null {
		return this.state.notes.get(noteId) || null;
	}

	getAllNotes(): GameplayNote[] {
		return Array.from(this.state.notes.values());
	}

	// Get notes in a time range (useful for rendering)
	getNotesInTimeRange(startTime: number, endTime: number): GameplayNote[] {
		return Array.from(this.state.notes.values()).filter(note =>
			note.timeMs >= startTime && note.timeMs <= endTime
		);
	}

	// Player state management
	updatePlayerScore(playerId: string, score: number, combo: number, maxCombo: number): void {
		const player = this.state.players.get(playerId);
		if (player) {
			player.score = score;
			player.combo = combo;
			player.maxCombo = Math.max(player.maxCombo, maxCombo);
			this.updatePlayerAccuracy(playerId);
		}
	}

	incrementPlayerHits(playerId: string): void {
		const player = this.state.players.get(playerId);
		if (player) {
			player.hitNotes++;
			this.updatePlayerAccuracy(playerId);
		}
	}

	incrementPlayerMisses(playerId: string): void {
		const player = this.state.players.get(playerId);
		if (player) {
			player.missedNotes++;
			this.updatePlayerAccuracy(playerId);
		}
	}

	private updatePlayerAccuracy(playerId: string): void {
		const player = this.state.players.get(playerId);
		if (player && player.totalNotes > 0) {
			player.accuracy = (player.hitNotes / (player.hitNotes + player.missedNotes)) * 100;
		}
	}

	getPlayerState(playerId: string): PlayerState | null {
		return this.state.players.get(playerId) || null;
	}

	getAllPlayers(): PlayerState[] {
		return Array.from(this.state.players.values());
	}

	// Multiplayer sync
	setSyncedTime(syncedTime: number): void {
		this.state.syncedTime = syncedTime;
	}

	getSyncedTime(): number {
		return this.state.syncedTime;
	}

	// Reset game state
	reset(): void {
		this.state = this.createInitialState();
	}

	// Cleanup
	cleanup(): void {
		this.state.players.clear();
		this.state.notes.clear();
	}
} 