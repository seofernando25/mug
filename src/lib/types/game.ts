export const Colors = {
	NOTE_TAP: 0x00ffff,       // Cyan (from types/game.ts)
	NOTE_HOLD_HEAD: 0xffa500, // Orange (from types/game.ts)
	NOTE_HOLD_BODY: 0xffd700, // Gold (from types/game.ts)
	NOTE_HOLD_HEAD_ACTIVE: 0xffdd00, // Brighter Orange/Yellow for active hold head (from types/game.ts)
	NOTE_HOLD_BODY_ACTIVE: 0xffff00, // Bright Yellow for active hold body (from types/game.ts)
	NOTE_BROKEN_COLOR: 0x888888, // Gray for broken holds (from types/game.ts)

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

	// General palette from original types/game.ts
	RED: 0xff0000,
	BLUE: 0x0000ff,
	GREEN: 0x00ff00,
	WHITE: 0xffffff,
	BLACK: 0x000000,
	DARK_GRAY: 0x333333,
	LIGHT_GRAY: 0xcccccc,
	PURPLE: 0x800080,
	YELLOW: 0xffff00,
	BORDER_COLOR: 0xaaaaaa,
};

export const AlphaValues = {
	RECEPTOR_IDLE: 0.3,
	RECEPTOR_PRESSED: 0.8,
	NOTE_IDLE: 0.9,
	NOTE_HIT: 0.5,
	BEAT_LINE: 0.2,
	HIT_ZONE_CENTER: 0.3,
	LANE_BACKGROUND: 0.5,
	HIT_ZONE_EDGES: 0.5,
	NOTE_OPAQUE: 1.0,
	NOTE_TRANSLUCENT: 0.7,
};

export const GameplaySizingConstants = {
	RECEPTOR_HEIGHT_RATIO: 0.1,
	NOTE_WIDTH_RATIO: 0.9,
	HIGHWAY_BORDER_THICKNESS: 2,
	TARGET_LINE_THICKNESS: 2,
	LANE_DIVIDER_THICKNESS: 1,
	BEATLINE_THICKNESS: 1,
	BEAT_LINE_HEIGHT: 5,
	HIT_ZONE_Y_RATIO: 0.85,
	HIGHWAY_WIDTH_RATIO: 0.6,
	NOTE_HEIGHT: 20,
	HIGHWAY_LINE_THICKNESS: 1,
	RECEPTOR_AREA_HEIGHT_RATIO: 0.15,
	JUDGMENT_LINE_Y_OFFSET: -30,
};

export const Timing = {
	LOOKAHEAD_SECONDS: 3.0,
	NOTE_RENDER_GRACE_PERIOD_MS: 500,
	JUDGMENT_OFFSET_MS: 0,
	HIT_WINDOW_PERFECT_MS: 30,
	HIT_WINDOW_GREAT_MS: 60,
	HIT_WINDOW_GOOD_MS: 100,
	HIT_WINDOW_MISS_MS: 150,
};

export const DebugColors = {
	NOTE_DEBUG_BOX: 0xff00ff,     // Magenta for note debug bounding boxes
};

// Custom type for PIXI.Text objects used for judgments
import type { Text } from 'pixi.js';
export interface JudgmentText extends Text {
	creationTime: number;
	lane: number;
	updateAnimation: (deltaMs: number) => void;
} 