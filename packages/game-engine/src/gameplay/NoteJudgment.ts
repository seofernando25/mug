import type { GameplayNote, NoteJudgment } from '../types/NoteTypes';
import {
	breakHoldNote,
	completeHoldNote,
	hitTapNote,
	isHoldNoteActive,
	isNoteWaiting,
	missTapNote,
	startHoldNote
} from '../types/NoteTypes';
import { HoldNoteLogic } from './HoldNoteLogic';
import { TimingWindows } from './TimingWindows';

export interface NoteJudgmentResult {
	noteId: number;
	judgment: NoteJudgment;
	scoreValue: number;
	newNoteState: any; // Will be the appropriate note state from discriminated union
	actionType: 'hit' | 'miss' | 'holdStart' | 'holdEnd' | 'holdBreak';
}

export class NoteJudgmentSystem {
	private timingWindows: TimingWindows;
	private holdNoteLogic: HoldNoteLogic;

	constructor(timingWindows: TimingWindows, holdNoteLogic: HoldNoteLogic) {
		this.timingWindows = timingWindows;
		this.holdNoteLogic = holdNoteLogic;
	}

	// Find the best hittable note in a lane at current time
	findBestHittableNote(notes: GameplayNote[], lane: number, currentTime: number): GameplayNote | null {
		const laneNotes = notes.filter(note =>
			note.lane === lane &&
			isNoteWaiting({ ...note, noteState: note.noteState })
		);

		if (laneNotes.length === 0) return null;

		// Sort by time and find the earliest hittable note
		laneNotes.sort((a, b) => a.timeMs - b.timeMs);

		for (const note of laneNotes) {
			const result = this.timingWindows.checkNoteHit(note, currentTime);
			if (result.hit) {
				return note;
			}

			// If we've passed this note's hit window, continue to next
			if (this.timingWindows.isNoteMissed(note, currentTime)) {
				continue;
			}

			// If this note is too early, all subsequent notes will be too early
			break;
		}

		return null;
	}

	// Process a key press and determine what happens
	processKeyPress(notes: GameplayNote[], lane: number, currentTime: number): NoteJudgmentResult | null {
		const hittableNote = this.findBestHittableNote(notes, lane, currentTime);
		if (!hittableNote) return null;

		const timingResult = this.timingWindows.checkNoteHit(hittableNote, currentTime);
		if (!timingResult.hit || !timingResult.judgment) return null;

		if (hittableNote.noteInfo.type === 'tap') {
			return {
				noteId: hittableNote.id,
				judgment: timingResult.judgment,
				scoreValue: timingResult.scoreValue,
				newNoteState: hitTapNote(timingResult.judgment),
				actionType: 'hit'
			};
		} else { // hold note
			return {
				noteId: hittableNote.id,
				judgment: timingResult.judgment,
				scoreValue: timingResult.scoreValue,
				newNoteState: startHoldNote(timingResult.judgment),
				actionType: 'holdStart'
			};
		}
	}

	// Process a key release for hold notes
	processKeyRelease(notes: GameplayNote[], lane: number, currentTime: number): NoteJudgmentResult | null {
		// Find active hold note in this lane
		const activeHoldNote = notes.find(note =>
			note.lane === lane &&
			isHoldNoteActive({ ...note, noteState: note.noteState })
		);

		if (!activeHoldNote || activeHoldNote.noteInfo.type !== 'hold') return null;

		// Check if hold should be broken or completed
		if (this.holdNoteLogic.shouldBreakHoldEarly(activeHoldNote, currentTime)) {
			return {
				noteId: activeHoldNote.id,
				judgment: { type: 'miss' },
				scoreValue: 0,
				newNoteState: breakHoldNote(
					(activeHoldNote.noteState as any).state.startJudgment,
					'released_early'
				),
				actionType: 'holdBreak'
			};
		} else {
			const releaseJudgment = this.holdNoteLogic.calculateHoldReleaseJudgment(activeHoldNote, currentTime);
			return {
				noteId: activeHoldNote.id,
				judgment: releaseJudgment,
				scoreValue: 0, // Score will be calculated by ScoreSystem
				newNoteState: completeHoldNote(
					(activeHoldNote.noteState as any).state.startJudgment,
					releaseJudgment
				),
				actionType: 'holdEnd'
			};
		}
	}

	// Find all notes that should be missed at current time
	findMissedNotes(notes: GameplayNote[], currentTime: number): NoteJudgmentResult[] {
		const missedResults: NoteJudgmentResult[] = [];

		const missedNotes = notes.filter(note =>
			isNoteWaiting({ ...note, noteState: note.noteState }) &&
			this.timingWindows.isNoteMissed(note, currentTime)
		);

		missedNotes.forEach(note => {
			missedResults.push({
				noteId: note.id,
				judgment: { type: 'miss' },
				scoreValue: 0,
				newNoteState: missTapNote(),
				actionType: 'miss'
			});
		});

		return missedResults;
	}

	// Check for hold notes that should be broken due to being held too long
	findBrokenHoldNotes(notes: GameplayNote[], currentTime: number): NoteJudgmentResult[] {
		const brokenResults: NoteJudgmentResult[] = [];

		const activeHoldNotes = notes.filter(note =>
			isHoldNoteActive({ ...note, noteState: note.noteState })
		);

		activeHoldNotes.forEach(note => {
			if (this.holdNoteLogic.shouldBreakHoldLate(note, currentTime)) {
				brokenResults.push({
					noteId: note.id,
					judgment: { type: 'miss' },
					scoreValue: 0,
					newNoteState: breakHoldNote(
						(note.noteState as any).state.startJudgment,
						'held_too_long'
					),
					actionType: 'holdBreak'
				});
			}
		});

		return brokenResults;
	}

	// Get timing windows for external access
	getTimingWindows(): TimingWindows {
		return this.timingWindows;
	}

	// Get hold note logic for external access
	getHoldNoteLogic(): HoldNoteLogic {
		return this.holdNoteLogic;
	}
} 