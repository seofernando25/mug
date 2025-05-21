


export const Colors = {
	RED: 0xff0000, // Example
	BLUE: 0x0000ff,
	GREEN: 0x00ff00,
	WHITE: 0xffffff,
	BLACK: 0x000000,
	DARK_GRAY: 0x333333,
	LIGHT_GRAY: 0xcccccc,
	PURPLE: 0x800080,
	YELLOW: 0xffff00,
	BORDER_COLOR: 0xaaaaaa,
	HIT_ZONE_BORDER: 0x555555,
	HIT_ZONE_CENTER: 0x444444,
	NOTE_TAP: 0x00ffff, // Cyan
	NOTE_HOLD_HEAD: 0xffa500, // Orange
	NOTE_HOLD_BODY: 0xffd700, // Gold
	BEAT_LINE: 0x888888,
};

export const AlphaValues = {
	RECEPTOR_IDLE: 0.3,
	RECEPTOR_PRESSED: 0.8,
	NOTE_IDLE: 0.9,
	NOTE_HIT: 0.5,
	BEAT_LINE: 0.5,
	HIT_ZONE_CENTER: 0.2, // Placeholder
};

export const GameplaySizingConstants = {
	RECEPTOR_HEIGHT_RATIO: 0.1, // Example: 10% of highway height
	NOTE_WIDTH_RATIO: 0.9, // Example: 90% of lane width
	JUDGMENT_TEXT_OFFSET_Y: -50, // Pixels above hitzone
	HIGHWAY_BORDER_THICKNESS: 2,
	TARGET_LINE_THICKNESS: 2,
	LANE_DIVIDER_THICKNESS: 1,
	BEATLINE_THICKNESS: 1,
	BEAT_LINE_HEIGHT: 5,
	HIT_ZONE_Y_RATIO: 0.8, // Placeholder: 80% down the stage height
};

export const Timing = {
	LOOKAHEAD_SECONDS: 5, // How many seconds of notes to consider/render ahead
	NOTE_RENDER_GRACE_PERIOD_MS: 500, // How long a note stays visible after its time if missed
	JUDGMENT_OFFSET_MS: 0, // Global judgment timing offset
}; 