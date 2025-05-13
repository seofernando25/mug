export const Colors = {
	NOTE_TAP: 0x00ff00,
	NOTE_HOLD_HEAD: 0x00aaff,
	NOTE_HOLD_BODY: 0x0077cc,
	BEAT_LINE: 0x555555,
	HIGHWAY_LINE: 0x888888,
	LANE_BACKGROUNDS: [0x2a2a2e, 0x3a3a3e], // For alternating lane colors
	HIT_ZONE_CENTER: 0xffffff, // Existing HIT_ZONE color for the center
	HIT_ZONE_EDGES: 0xaaaaaa,  // A slightly dimmer color for the edges
	BACKGROUND: 0x18181b, // From PixiJS background init
};

export const AlphaValues = {
	BEAT_LINE: 0.7,
	HIT_ZONE_CENTER: 0.9, // Existing HIT_ZONE alpha
	HIT_ZONE_EDGES: 0.7,
	LANE_BACKGROUND: 0.8,
};

export const GameplaySizing = {
	BEAT_LINE_HEIGHT: 2,
	HIGHWAY_WIDTH_RATIO: 0.6, // Proportion of screen width
	HIT_ZONE_Y_RATIO: 0.85,   // Proportion of screen height from top (center of the perfect hit line)
	NOTE_HEIGHT: 40,          // For tap notes and hold note heads
	// HIT_ZONE_HEIGHT: 20, // No longer directly used for drawing the hit window lines, visual span is dynamic
	HIGHWAY_LINE_THICKNESS: 2,
	NOTE_WIDTH_RATIO: 0.9,    // Proportion of lane width
};

// Timing constants might be better here too, or in their own file if they grow
export const Timing = {
	NOTE_RENDER_GRACE_PERIOD_MS: 500, // How long notes stay visible after passing hit zone time
	LOOKAHEAD_SECONDS: 8.0,         // How many seconds in advance notes appear
	HIT_WINDOW_MS: 150, // The +/- milliseconds for the hit window
};

export const DebugColors = {
    NOTE_TOP_BOTTOM_LINE: 0xffff00, // Yellow
    NOTE_CENTER_LINE: 0xff0000,     // Red
}; 