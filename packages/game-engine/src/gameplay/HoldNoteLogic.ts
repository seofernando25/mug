import type { GameplayNote, NoteJudgment } from '../types/NoteTypes';
import type { HitWindow } from './TimingWindows';

export interface HoldNoteState {
	isActive: boolean;
	startTime: number;
	startJudgment: NoteJudgment | null;
	endTime: number;
	isCompleted: boolean;
	isBroken: boolean;
	breakReason?: 'released_early' | 'held_too_long';
}

export class HoldNoteLogic {
	private hitWindows: HitWindow;

	constructor(hitWindows: HitWindow) {
		this.hitWindows = hitWindows;
	}

	// Check if a hold note should start
	canStartHold(note: GameplayNote, currentTime: number): boolean {
		if (note.noteInfo.type !== 'hold') return false;

		const timeDifference = Math.abs(note.timeMs - currentTime);
		return timeDifference <= this.hitWindows.meh;
	}

	// Check if a hold note should be broken for early release
	shouldBreakHoldEarly(note: GameplayNote, releaseTime: number): boolean {
		if (note.noteInfo.type !== 'hold') return false;

		const holdEndTime = note.timeMs + note.noteInfo.durationMs;
		const earlyReleaseThreshold = holdEndTime - this.hitWindows.meh;

		return releaseTime < earlyReleaseThreshold;
	}

	// Check if a hold note should be broken for being held too long
	shouldBreakHoldLate(note: GameplayNote, currentTime: number): boolean {
		if (note.noteInfo.type !== 'hold') return false;

		const holdEndTime = note.timeMs + note.noteInfo.durationMs;
		const lateReleaseThreshold = holdEndTime + this.hitWindows.meh;

		return currentTime > lateReleaseThreshold;
	}

	// Calculate judgment for hold note release
	calculateHoldReleaseJudgment(note: GameplayNote, releaseTime: number): NoteJudgment {
		if (note.noteInfo.type !== 'hold') {
			return { type: 'miss' };
		}

		const holdEndTime = note.timeMs + note.noteInfo.durationMs;
		const timeDifference = holdEndTime - releaseTime;
		const absTimeDifference = Math.abs(timeDifference);

		return this.calculateJudgment(timeDifference, absTimeDifference);
	}

	// Check if a hold note is in the correct time window to be released
	isInReleaseWindow(note: GameplayNote, currentTime: number): boolean {
		if (note.noteInfo.type !== 'hold') return false;

		const holdEndTime = note.timeMs + note.noteInfo.durationMs;
		const timeDifference = Math.abs(holdEndTime - currentTime);

		return timeDifference <= this.hitWindows.meh;
	}

	// Get the ideal release time for a hold note
	getIdealReleaseTime(note: GameplayNote): number {
		if (note.noteInfo.type !== 'hold') return note.timeMs;
		return note.timeMs + note.noteInfo.durationMs;
	}

	// Get the earliest valid release time
	getEarliestReleaseTime(note: GameplayNote): number {
		if (note.noteInfo.type !== 'hold') return note.timeMs;
		const holdEndTime = note.timeMs + note.noteInfo.durationMs;
		return holdEndTime - this.hitWindows.meh;
	}

	// Get the latest valid release time
	getLatestReleaseTime(note: GameplayNote): number {
		if (note.noteInfo.type !== 'hold') return note.timeMs;
		const holdEndTime = note.timeMs + note.noteInfo.durationMs;
		return holdEndTime + this.hitWindows.meh;
	}

	// Update hit windows
	updateHitWindows(newWindows: HitWindow): void {
		this.hitWindows = newWindows;
	}

	private calculateJudgment(timeDifference: number, absTimeDifference: number): NoteJudgment {
		if (absTimeDifference <= this.hitWindows.perfect) {
			return { type: 'perfect' };
		} else if (absTimeDifference <= this.hitWindows.excellent) {
			return {
				type: 'excellent',
				timing: timeDifference < 0 ? 'late' : 'early'
			};
		} else if (absTimeDifference <= this.hitWindows.good) {
			return {
				type: 'good',
				timing: timeDifference < 0 ? 'late' : 'early'
			};
		} else if (absTimeDifference <= this.hitWindows.meh) {
			return {
				type: 'meh',
				timing: timeDifference < 0 ? 'late' : 'early'
			};
		} else {
			return { type: 'miss' };
		}
	}
} 