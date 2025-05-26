import type { NoteJudgment } from '../types/NoteTypes';

export interface ComboState {
	current: number;
	max: number;
	lastJudgment: NoteJudgment | null;
}

export class ComboTracker {
	private comboState: ComboState;

	constructor() {
		this.comboState = {
			current: 0,
			max: 0,
			lastJudgment: null
		};
	}

	// Process a hit and update combo
	processHit(judgment: NoteJudgment): ComboState {
		// Only certain judgments maintain combo
		if (this.shouldMaintainCombo(judgment)) {
			this.comboState.current++;
			this.comboState.max = Math.max(this.comboState.max, this.comboState.current);
		} else {
			this.comboState.current = 0;
		}

		this.comboState.lastJudgment = judgment;
		return this.getComboState();
	}

	// Process a miss and break combo
	processMiss(): ComboState {
		this.comboState.current = 0;
		this.comboState.lastJudgment = { type: 'miss' };
		return this.getComboState();
	}

	// Get current combo state (read-only)
	getComboState(): Readonly<ComboState> {
		return { ...this.comboState };
	}

	// Reset combo to initial state
	reset(): void {
		this.comboState = {
			current: 0,
			max: 0,
			lastJudgment: null
		};
	}

	// Check if combo should continue based on judgment
	private shouldMaintainCombo(judgment: NoteJudgment): boolean {
		// Typically, only miss breaks combo, but this can be customized
		return judgment.type !== 'miss';
	}

	// Get combo multiplier (for games that use combo-based scoring)
	getComboMultiplier(): number {
		const combo = this.comboState.current;

		// Example combo multiplier system
		if (combo >= 100) return 4.0;
		if (combo >= 50) return 3.0;
		if (combo >= 25) return 2.0;
		if (combo >= 10) return 1.5;
		return 1.0;
	}
} 