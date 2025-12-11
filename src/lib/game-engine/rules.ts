import type { GameConfig, Judgment } from './types';

export const DEFAULT_CONFIG: GameConfig = {
	timingWindows: {
		perfect: 30,
		excellent: 60,
		good: 90,
		meh: 150
	},
	scrollSpeed: 1.0
};

export const SCORING = {
	tap: {
		PERFECT: 300,
		EXCELLENT: 200,
		GOOD: 100,
		MEH: 50,
		MISS: 0
	},
	holdRelease: {
		PERFECT: 150,
		EXCELLENT: 120,
		GOOD: 100,
		MEH: 50,
		MISS: 0
	}
} as const;

export function getJudgment(timeDiffMs: number, config: GameConfig): Judgment | 'IGNORE' {
	const absDiff = Math.abs(timeDiffMs);
	const w = config.timingWindows;

	if (absDiff <= w.perfect) return 'PERFECT';
	if (absDiff <= w.excellent) return 'EXCELLENT';
	if (absDiff <= w.good) return 'GOOD';
	if (absDiff <= w.meh) return 'MEH';

	// If too early, ignore; if too late, treat as miss in caller.
	return timeDiffMs < 0 ? 'MISS' : 'IGNORE';
}

