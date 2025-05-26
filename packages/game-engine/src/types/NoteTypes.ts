export type NoteInfo = {
	type: 'tap';
} | {
	type: 'hold';
	durationMs: number;
}

export interface HitObject {
	timeMs: number;
	lane: number;
	noteInfo: NoteInfo;
}

// Note judgment states using discriminated unions
export type NoteJudgment =
	| { type: 'perfect' }
	| { type: 'excellent'; timing: 'early' | 'late' }
	| { type: 'good'; timing: 'early' | 'late' }
	| { type: 'meh'; timing: 'early' | 'late' }
	| { type: 'miss' };

// Hold note states using discriminated unions
export type HoldNoteState =
	| { type: 'waiting' } // Waiting for initial hit
	| { type: 'active'; startJudgment: NoteJudgment } // Being held after successful hit
	| { type: 'broken'; startJudgment: NoteJudgment; breakReason: 'released_early' | 'held_too_long' }
	| { type: 'completed'; startJudgment: NoteJudgment; endJudgment: NoteJudgment };

// Tap note states using discriminated unions  
export type TapNoteState =
	| { type: 'waiting' } // Waiting to be hit
	| { type: 'hit'; judgment: NoteJudgment }
	| { type: 'missed' };

// Overall note state
export type NoteState =
	| { noteType: 'tap'; state: TapNoteState }
	| { noteType: 'hold'; state: HoldNoteState };

export interface GameplayNote extends HitObject {
	id: number; // Add back the ID for tracking
	noteState: NoteState;
}

// Helper functions for working with note states
export function isNoteWaiting(note: GameplayNote): boolean {
	return note.noteState.state.type === 'waiting';
}

export function isNoteHit(note: GameplayNote): boolean {
	if (note.noteState.noteType === 'tap') {
		return note.noteState.state.type === 'hit';
	} else {
		return note.noteState.state.type === 'active' ||
			note.noteState.state.type === 'completed';
	}
}

export function isNoteMissed(note: GameplayNote): boolean {
	if (note.noteState.noteType === 'tap') {
		return note.noteState.state.type === 'missed';
	} else {
		return note.noteState.state.type === 'broken';
	}
}

export function isHoldNoteActive(note: GameplayNote): boolean {
	return note.noteState.noteType === 'hold' &&
		note.noteState.state.type === 'active';
}

export function isHoldNoteBroken(note: GameplayNote): boolean {
	return note.noteState.noteType === 'hold' &&
		note.noteState.state.type === 'broken';
}

export function isHoldNoteCompleted(note: GameplayNote): boolean {
	return note.noteState.noteType === 'hold' &&
		note.noteState.state.type === 'completed';
}

// State transition functions
export function createInitialNoteState(noteInfo: NoteInfo): NoteState {
	if (noteInfo.type === 'tap') {
		return { noteType: 'tap', state: { type: 'waiting' } };
	} else {
		return { noteType: 'hold', state: { type: 'waiting' } };
	}
}

export function hitTapNote(judgment: NoteJudgment): NoteState {
	return { noteType: 'tap', state: { type: 'hit', judgment } };
}

export function missTapNote(): NoteState {
	return { noteType: 'tap', state: { type: 'missed' } };
}

export function startHoldNote(judgment: NoteJudgment): NoteState {
	return { noteType: 'hold', state: { type: 'active', startJudgment: judgment } };
}

export function breakHoldNote(startJudgment: NoteJudgment, reason: 'released_early' | 'held_too_long'): NoteState {
	return { noteType: 'hold', state: { type: 'broken', startJudgment, breakReason: reason } };
}

export function completeHoldNote(startJudgment: NoteJudgment, endJudgment: NoteJudgment): NoteState {
	return { noteType: 'hold', state: { type: 'completed', startJudgment, endJudgment } };
} 