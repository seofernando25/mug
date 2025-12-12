export const Colors = {
	HIGHWAY_LINE: 0x808080,
	LANE_BACKGROUNDS: [0x9f7b19, 0x9d4401, 0x851638, 0x7f2593],
	HIT_ZONE_CENTER: 0x444444,

	JUDGMENT_HIT: 0x00ff00,
	JUDGMENT_MISS: 0xff0000,
	LANE_COLORS: [0xffd22b, 0xfe7601, 0xe52661, 0xd940f9], // Note colors for lanes 1-4

	LANE_BACKGROUND_ALPHA: 0.8,
};

export const GameplaySizingConstants = {
	NOTE_WIDTH_RATIO: 0.9,
	HIT_ZONE_Y_RATIO: 0.85,
	HIGHWAY_LINE_THICKNESS: 0.6
};

// Custom type for PIXI.Text objects used for judgments
import type { Text } from 'pixi.js';
export interface JudgmentText extends Text {
	creationTime: number;
	lane: number;
	updateAnimation: (deltaMs: number) => void;
} 