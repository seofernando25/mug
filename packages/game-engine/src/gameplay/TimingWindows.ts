import type { GameConfig } from '../config/GameConfig';
import type { GameplayNote, NoteJudgment } from '../types/NoteTypes';

export interface HitWindow {
	perfect: number;
	excellent: number;
	good: number;
	meh: number;
}

export interface TimingResult {
	hit: boolean;
	judgment: NoteJudgment | null;
	timeDifference: number; // Negative if late, positive if early
	scoreValue: number;
}

export class TimingWindows {
	private hitWindows: HitWindow;

	constructor(config: GameConfig) {
		this.hitWindows = {
			perfect: config.timing.perfectWindowMs,
			excellent: config.timing.excellentWindowMs,
			good: config.timing.goodWindowMs,
			meh: config.timing.mehWindowMs
		};
	}

	// Check if a note can be hit at the current time
	checkNoteHit(note: GameplayNote, currentTime: number): TimingResult {
		const timeDifference = note.timeMs - currentTime;
		const absTimeDifference = Math.abs(timeDifference);

		// Check if within any hit window
		if (absTimeDifference <= this.hitWindows.meh) {
			const judgment = this.calculateJudgment(timeDifference, absTimeDifference);

			return {
				hit: true,
				judgment,
				timeDifference,
				scoreValue: 0 // Score calculation will be handled by ScoreSystem
			};
		}

		return {
			hit: false,
			judgment: null,
			timeDifference,
			scoreValue: 0
		};
	}

	// Check if a note should be considered missed
	isNoteMissed(note: GameplayNote, currentTime: number): boolean {
		const timeDifference = note.timeMs - currentTime;
		return timeDifference < -this.hitWindows.meh;
	}

	// Get the earliest time a note can be hit
	getEarliestHitTime(note: GameplayNote): number {
		return note.timeMs - this.hitWindows.meh;
	}

	// Get the latest time a note can be hit
	getLatestHitTime(note: GameplayNote): number {
		return note.timeMs + this.hitWindows.meh;
	}

	// Update hit windows (useful for difficulty adjustment)
	updateHitWindows(newWindows: Partial<HitWindow>): void {
		this.hitWindows = { ...this.hitWindows, ...newWindows };
	}

	// Get current hit windows (read-only)
	getHitWindows(): Readonly<HitWindow> {
		return { ...this.hitWindows };
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