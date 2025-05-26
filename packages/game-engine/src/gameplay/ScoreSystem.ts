import type { NoteJudgment } from '../types/NoteTypes';

export interface ScoreConfig {
	perfect: number;
	excellent: number;
	good: number;
	meh: number;
	miss: number;
	holdBonus: number; // Additional points for completing hold notes
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
	perfect: 300,
	excellent: 200,
	good: 100,
	meh: 50,
	miss: 0,
	holdBonus: 50
};

export class ScoreSystem {
	private scoreConfig: ScoreConfig;

	constructor(config: ScoreConfig = DEFAULT_SCORE_CONFIG) {
		this.scoreConfig = { ...config };
	}

	// Calculate score for a judgment
	calculateScore(judgment: NoteJudgment, isHoldNote: boolean = false): number {
		const baseScore = this.scoreConfig[judgment.type] || 0;

		// Add bonus for completing hold notes (except for misses)
		if (isHoldNote && judgment.type !== 'miss') {
			return baseScore + this.scoreConfig.holdBonus;
		}

		return baseScore;
	}

	// Calculate accuracy percentage based on hits and misses
	calculateAccuracy(totalNotes: number, perfectHits: number, excellentHits: number, goodHits: number, mehHits: number, misses: number): number {
		if (totalNotes === 0) return 100;

		// Weight different judgments for accuracy calculation
		const weightedScore = (perfectHits * 1.0) + (excellentHits * 0.9) + (goodHits * 0.7) + (mehHits * 0.4) + (misses * 0.0);
		const maxPossibleScore = totalNotes * 1.0;

		return Math.round((weightedScore / maxPossibleScore) * 100 * 100) / 100; // Round to 2 decimal places
	}

	// Update score configuration
	updateConfig(newConfig: Partial<ScoreConfig>): void {
		this.scoreConfig = { ...this.scoreConfig, ...newConfig };
	}

	// Get current score configuration (read-only)
	getConfig(): Readonly<ScoreConfig> {
		return { ...this.scoreConfig };
	}
} 