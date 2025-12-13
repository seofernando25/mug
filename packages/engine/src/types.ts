import type { chartHitObject } from "@mug/db";

export type ChartHitObject = typeof chartHitObject.$inferSelect;

export type Judgment = "PERFECT" | "EXCELLENT" | "GOOD" | "MEH" | "MISS";

export interface GameConfig {
	timingWindows: {
		perfect: number;
		excellent: number;
		good: number;
		meh: number;
	};
	scrollSpeed?: number;
}

export interface EngineNote extends Omit<ChartHitObject, "id"> {
	id: string | number;
	isHit: boolean;
	isMissed: boolean;
	isHolding: boolean;
	holdSatisfied: boolean;
	holdBroken: boolean;
}

export interface GameState {
	score: number;
	combo: number;
	maxCombo: number;
	notes: EngineNote[];
}

export interface GameEvent {
	type: "hit" | "miss" | "hold_broken";
	noteId: string | number;
	judgment?: Judgment;
	scoreDelta?: number;
	lane: number;
}
