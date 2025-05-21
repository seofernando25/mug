export const Colors = {
	NOTE_TAP: 0x00ffff,
	NOTE_HOLD_HEAD: 0xffb6c1,      // Light pink
	NOTE_HOLD_BODY: 0xffc0cb,      // Pink
	NOTE_HOLD_HEAD_ACTIVE: 0xff69b4, // Hot pink
	NOTE_HOLD_BODY_ACTIVE: 0xff1493, // Deep pink
	NOTE_BROKEN_COLOR: 0x8888ff,

	BEAT_LINE: 0x888888,      // Gray (from types/game.ts, constants.ts had 0xffffff)
	HIGHWAY_LINE: 0x808080,   // Grey (from game/constants.ts)
	LANE_BACKGROUNDS: [0x2a2a2a, 0x3a3a3a, 0x2a2a2a, 0x3a3a3a], // Alternating dark greys (from game/constants.ts)
	HIT_ZONE_CENTER: 0x444444,  // Dark Gray (from types/game.ts, constants.ts had 0xffff00)
	HIT_ZONE_EDGES: 0xffd700,   // Gold (from game/constants.ts)
	HIT_ZONE_BORDER: 0x555555, // (from types/game.ts)
	BACKGROUND: 0x1a1a1a,      // Dark background (from game/constants.ts)
	BACKGROUND_PULSE: 0x202020, // Slightly lighter for background pulse effects (from game/constants.ts)

	JUDGMENT_HIT: 0x00ff00,     // Green (from game/constants.ts)
	JUDGMENT_MISS: 0xff0000,    // Red (from game/constants.ts)
	LANE_COLORS: [0xff0000, 0x00ff00, 0xffff00, 0x0000ff], // Red, Green, Yellow, Blue (from game/constants.ts)
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