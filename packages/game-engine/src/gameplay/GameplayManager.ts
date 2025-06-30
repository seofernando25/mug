import type { GameConfig } from '../config/GameConfig';
import type { GameplayNote, HitObject, NoteJudgment } from '../types/NoteTypes';
import { createInitialNoteState } from '../types/NoteTypes';
import { ComboTracker } from './ComboTracker';
import { HoldNoteLogic } from './HoldNoteLogic';
import { NoteJudgmentSystem, type NoteJudgmentResult } from './NoteJudgment';
import { ScoreSystem } from './ScoreSystem';
import { TimingWindows } from './TimingWindows';

export interface GameplayCallbacks {
	onNoteHit?: (noteId: number, judgment: NoteJudgment, score: number, playerId?: string) => void;
	onNoteMiss?: (noteId: number, playerId?: string) => void;
	onScoreUpdate?: (playerId: string, score: number, combo: number, accuracy: number) => void;
	onCountdownUpdate?: (count: number) => void;
	onRequestStartAudio?: () => void;
	onRequestStopAudio?: () => void;
	onAllNotesJudged?: () => void;
}

export interface PlayerGameplayState {
	score: number;
	combo: number;
	maxCombo: number;
	hits: number;
	misses: number;
	accuracy: number;
}

export class GameplayManager {
	private config: GameConfig;
	private callbacks: GameplayCallbacks;

	// Gameplay systems
	private timingWindows: TimingWindows;
	private holdNoteLogic: HoldNoteLogic;
	private noteJudgmentSystem: NoteJudgmentSystem;
	private scoreSystem: ScoreSystem;
	private comboTrackers: Map<string, ComboTracker>;
	private playerStates: Map<string, PlayerGameplayState>;

	private notes: GameplayNote[] = [];
	private activeCountdownTimer: any | null = null;

	constructor(config: GameConfig, callbacks: GameplayCallbacks = {}) {
		this.config = config;
		this.callbacks = callbacks;

		// Initialize gameplay systems
		this.timingWindows = new TimingWindows(config);
		this.holdNoteLogic = new HoldNoteLogic(this.timingWindows.getHitWindows());
		this.noteJudgmentSystem = new NoteJudgmentSystem(this.timingWindows, this.holdNoteLogic);
		this.scoreSystem = new ScoreSystem();
		this.comboTrackers = new Map();
		this.playerStates = new Map();
	}

	// Initialize players
	initializePlayers(playerIds: string[]): void {
		this.comboTrackers.clear();
		this.playerStates.clear();

		playerIds.forEach(playerId => {
			this.comboTrackers.set(playerId, new ComboTracker());
			this.playerStates.set(playerId, {
				score: 0,
				combo: 0,
				maxCombo: 0,
				hits: 0,
				misses: 0,
				accuracy: 100
			});
		});
	}

	// Process key press
	processKeyPress(notes: GameplayNote[], lane: number, currentTime: number, playerId: string = 'player1'): void {
		const result = this.noteJudgmentSystem.processKeyPress(notes, lane, currentTime);
		if (!result) return;

		this.processNoteResult(result, playerId);
	}

	// Process key release
	processKeyRelease(notes: GameplayNote[], lane: number, currentTime: number, playerId: string = 'player1'): void {
		const result = this.noteJudgmentSystem.processKeyRelease(notes, lane, currentTime);
		if (!result) return;

		this.processNoteResult(result, playerId);
	}

	// Check for missed notes
	checkMissedNotes(notes: GameplayNote[], currentTime: number): NoteJudgmentResult[] {
		const results = this.noteJudgmentSystem.findMissedNotes(notes, currentTime);

		results.forEach(result => {
			// For missed notes, affect all players (in single player, just player1)
			this.playerStates.forEach((_, playerId) => {
				this.processMiss(playerId);
			});

			this.callbacks.onNoteMiss?.(result.noteId);
		});

		return results;
	}

	// Check for broken hold notes
	checkBrokenHoldNotes(notes: GameplayNote[], currentTime: number): NoteJudgmentResult[] {
		const results = this.noteJudgmentSystem.findBrokenHoldNotes(notes, currentTime);

		results.forEach(result => {
			// For broken holds, affect all players
			this.playerStates.forEach((_, playerId) => {
				this.processMiss(playerId);
			});

			this.callbacks.onNoteMiss?.(result.noteId);
		});

		return results;
	}

	// Get player state
	getPlayerState(playerId: string): PlayerGameplayState | null {
		return this.playerStates.get(playerId) || null;
	}

	// Get all player states
	getAllPlayerStates(): Map<string, PlayerGameplayState> {
		return new Map(this.playerStates);
	}

	// Reset all player states
	reset(): void {
		this.comboTrackers.forEach(tracker => tracker.reset());
		this.playerStates.forEach(state => {
			state.score = 0;
			state.combo = 0;
			state.maxCombo = 0;
			state.hits = 0;
			state.misses = 0;
			state.accuracy = 100;
		});
	}

	// Get gameplay systems for external access
	getTimingWindows(): TimingWindows {
		return this.timingWindows;
	}

	getScoreSystem(): ScoreSystem {
		return this.scoreSystem;
	}

	private processNoteResult(result: NoteJudgmentResult, playerId: string): void {
		if (result.actionType === 'miss') {
			this.processMiss(playerId);
		} else {
			this.processHit(result, playerId);
		}
	}

	private processHit(result: NoteJudgmentResult, playerId: string): void {
		const playerState = this.playerStates.get(playerId);
		const comboTracker = this.comboTrackers.get(playerId);

		if (!playerState || !comboTracker) return;

		// Update combo
		const comboState = comboTracker.processHit(result.judgment);

		// Calculate score
		const isHoldNote = result.actionType === 'holdStart' || result.actionType === 'holdEnd';
		const score = this.scoreSystem.calculateScore(result.judgment, isHoldNote);

		// Update player state
		playerState.score += score;
		playerState.combo = comboState.current;
		playerState.maxCombo = comboState.max;
		playerState.hits++;
		playerState.accuracy = this.calculateAccuracy(playerState);

		// Notify callbacks
		this.callbacks.onNoteHit?.(result.noteId, result.judgment, score, playerId);
		this.callbacks.onScoreUpdate?.(playerId, playerState.score, playerState.combo, playerState.accuracy);
	}



	private calculateAccuracy(playerState: PlayerGameplayState): number {
		const totalNotes = playerState.hits + playerState.misses;
		if (totalNotes === 0) return 100;

		return Math.round((playerState.hits / totalNotes) * 100 * 100) / 100;
	}

	
	public loadNotes(hitObjects: HitObject[]): void {
		// Convert HitObjects to GameplayNotes with initial state
		this.notes = hitObjects.map((hitObject, index) => ({
			...hitObject,
			id: index, // Generate sequential IDs
			noteState: createInitialNoteState(hitObject.noteInfo)
		})).sort((a, b) => a.timeMs - b.timeMs);
	}

	public startPreparation(): void {
		console.log("GameplayManager: Starting preparation (e.g., countdown).");
		this.reset();

		let count = this.config.countdownSeconds || 3;
		this.callbacks.onCountdownUpdate?.(count);

		if (this.activeCountdownTimer) clearInterval(this.activeCountdownTimer);

		this.activeCountdownTimer = setInterval(() => {
			count--;
			this.callbacks.onCountdownUpdate?.(count);
			if (count <= 0) {
				if (this.activeCountdownTimer) clearInterval(this.activeCountdownTimer);
				this.activeCountdownTimer = null;
				this.callbacks.onRequestStartAudio?.();
			}
		}, 1000);
	}

	public update(currentTimeMs: number): void {

		const missedResults = this.noteJudgmentSystem.findMissedNotes(this.notes, currentTimeMs);
		missedResults.forEach(result => {
			// Update GameStateManager first as it holds the authoritative state
			this.playerStates.forEach((_, playerId) => this.processMiss(playerId, result.noteId));
		});

		const brokenHoldResults = this.noteJudgmentSystem.findBrokenHoldNotes(this.notes, currentTimeMs);
		brokenHoldResults.forEach(result => {
			// Update GameStateManager with the new note state from the judgment result
			this.playerStates.forEach((_, playerId) => this.processMiss(playerId, result.noteId));
		});

		const allEffectivelyJudged = this.notes.every(note => {
			const currentNoteState = note.noteState;
			if (currentNoteState.noteType === 'tap') {
				return currentNoteState.state.type === 'hit' || currentNoteState.state.type === 'missed';
			} else if (currentNoteState.noteType === 'hold') {
				return currentNoteState.state.type === 'completed' || currentNoteState.state.type === 'broken';
			}
			return false;
		});

		if (allEffectivelyJudged && this.notes.length > 0) { // Ensure notes were loaded
			this.callbacks.onAllNotesJudged?.();
		}
	}

	public processInput(type: 'press' | 'release', key: string, currentTimeMs: number, playerId: string = 'player1'): void {

		const lane = this.config.keybindings.indexOf(key.toLowerCase());
		if (lane === -1) return;

		// if (type === 'press') {
		// 	this.eventQueue.enqueue({
		// 		type: "keyPress",
		// 		lane,
		// 		key,
		// 	})
		// } else if (type === 'release') {
		// 	this.eventQueue.enqueue({
		// 		type: "",
		// 		lane,
		// 		key,
		// 	})
		// }

		// Read notes from GameStateManager for fresh state, or use internal this.notes if that's intended as the working copy.
		// For now, using this.notes which loadNotes populates.
		const currentNotes = this.notes;

		let result: NoteJudgmentResult | null = null;
		if (type === 'press') {
			result = this.noteJudgmentSystem.processKeyPress(currentNotes, lane, currentTimeMs);
		} else {
			result = this.noteJudgmentSystem.processKeyRelease(currentNotes, lane, currentTimeMs);
		}

		if (!result) return;

		// Update GameStateManager with the new note state from the judgment result

		this.processNoteResult(result, playerId);
	}



	private processMiss(playerId: string, noteIdToMiss?: number): void {
		const playerState = this.playerStates.get(playerId);
		const comboTracker = this.comboTrackers.get(playerId);

		if (!playerState || !comboTracker) return;

		const comboState = comboTracker.processMiss();

		playerState.combo = comboState.current;
		playerState.maxCombo = comboState.max;
		playerState.misses++;
		playerState.accuracy = this.calculateAccuracy(playerState);

		this.callbacks.onScoreUpdate?.(playerId, playerState.score, playerState.combo, playerState.accuracy);
		if (noteIdToMiss !== undefined) {
			this.callbacks.onNoteMiss?.(noteIdToMiss, playerId);
		}
	}

	public cleanup(): void {
		if (this.activeCountdownTimer) {
			clearInterval(this.activeCountdownTimer);
			this.activeCountdownTimer = null;
		}
		this.notes = [];
		this.reset();
		console.log("GameplayManager: Cleaned up.");
	}
} 