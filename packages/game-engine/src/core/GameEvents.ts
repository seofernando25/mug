import type { GameplaySong } from '../types/ChartTypes';
import type { NoteJudgment } from '../types/NoteTypes';

// Base event interface
export interface BaseGameEvent {
	id: string;
	timestamp: number; // When the event was created
	gameTime: number; // Game time when this event should be processed
	playerId?: string; // For multiplayer - which player triggered this event
}

// Input events - things players do
export interface KeyPressEvent extends BaseGameEvent {
	type: 'keyPress';
	lane: number;
	key: string;
}

export interface KeyReleaseEvent extends BaseGameEvent {
	type: 'keyRelease';
	lane: number;
	key: string;
}

// Game logic events - results of input processing
export interface NoteHitEvent extends BaseGameEvent {
	type: 'noteHit';
	noteId: number;
	lane: number;
	judgment: NoteJudgment;
	scoreAwarded: number;
}

export interface NoteMissEvent extends BaseGameEvent {
	type: 'noteMiss';
	noteId: number;
	lane: number;
}

export interface HoldStartEvent extends BaseGameEvent {
	type: 'holdStart';
	noteId: number;
	lane: number;
	judgment: NoteJudgment;
}

export interface HoldEndEvent extends BaseGameEvent {
	type: 'holdEnd';
	noteId: number;
	lane: number;
	judgment: NoteJudgment;
	completed: boolean; // true if completed successfully, false if broken
	breakReason?: 'released_early' | 'held_too_long';
}

// Game state events
export interface GameStartEvent extends BaseGameEvent {
	type: 'gameStart';
	song: GameplaySong;
	players: string[]; // Player IDs
}

export interface GamePauseEvent extends BaseGameEvent {
	type: 'gamePause';
}

export interface GameResumeEvent extends BaseGameEvent {
	type: 'gameResume';
}

export interface GameEndEvent extends BaseGameEvent {
	type: 'gameEnd';
	reason: 'songComplete' | 'playerQuit' | 'error';
}

export interface CountdownEvent extends BaseGameEvent {
	type: 'countdown';
	count: number; // 3, 2, 1, 0 (0 = start)
}

// --- Core Engine Specific Events ---
export interface CoreEnginePauseEvent extends BaseGameEvent {
	type: 'coreEnginePause';
}

export interface CoreEngineResumeEvent extends BaseGameEvent {
	type: 'coreEngineResume';
}

// Score events
export interface ScoreUpdateEvent extends BaseGameEvent {
	type: 'scoreUpdate';
	score: number;
	combo: number;
	maxCombo: number;
	accuracy: number;
}

// Union of all game events
export type GameEvent =
	| KeyPressEvent
	| KeyReleaseEvent
	| NoteHitEvent
	| NoteMissEvent
	| HoldStartEvent
	| HoldEndEvent
	| GameStartEvent
	| GamePauseEvent
	| GameResumeEvent
	| GameEndEvent
	| CountdownEvent
	| ScoreUpdateEvent
	| CoreEnginePauseEvent
	| CoreEngineResumeEvent;

// Event handler type
export type EventHandler<T extends GameEvent = GameEvent> = (event: T) => void;

// Event type guard helpers
export function isInputEvent(event: GameEvent): event is KeyPressEvent | KeyReleaseEvent {
	return event.type === 'keyPress' || event.type === 'keyRelease';
}

export function isNoteEvent(event: GameEvent): event is NoteHitEvent | NoteMissEvent | HoldStartEvent | HoldEndEvent {
	return event.type === 'noteHit' || event.type === 'noteMiss' || event.type === 'holdStart' || event.type === 'holdEnd';
}

export function isGameStateEvent(event: GameEvent): event is GameStartEvent | GamePauseEvent | GameResumeEvent | GameEndEvent | CountdownEvent {
	return event.type === 'gameStart' || event.type === 'gamePause' || event.type === 'gameResume' || event.type === 'gameEnd' || event.type === 'countdown';
}

// Event factory functions
export function createKeyPressEvent(lane: number, key: string, gameTime: number, playerId?: string): KeyPressEvent {
	return {
		id: crypto.randomUUID(),
		type: 'keyPress',
		timestamp: Date.now(),
		gameTime,
		lane,
		key,
		playerId
	};
}

export function createKeyReleaseEvent(lane: number, key: string, gameTime: number, playerId?: string): KeyReleaseEvent {
	return {
		id: crypto.randomUUID(),
		type: 'keyRelease',
		timestamp: Date.now(),
		gameTime,
		lane,
		key,
		playerId
	};
}

export function createNoteHitEvent(noteId: number, lane: number, judgment: NoteJudgment, scoreAwarded: number, gameTime: number, playerId?: string): NoteHitEvent {
	return {
		id: crypto.randomUUID(),
		type: 'noteHit',
		timestamp: Date.now(),
		gameTime,
		noteId,
		lane,
		judgment,
		scoreAwarded,
		playerId
	};
} 