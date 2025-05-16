export const Colors = {
    NOTE_TAP: 0xff0000,       // Example: Red for tap notes
    NOTE_HOLD_HEAD: 0x00ff00, // Example: Green for hold heads
    NOTE_HOLD_BODY: 0x00aa00, // Example: Darker green for hold bodies
    BEAT_LINE: 0xffffff,      // Example: White for beat lines
    HIGHWAY_LINE: 0x808080,   // Example: Grey for highway separator lines
    LANE_BACKGROUNDS: [0x2a2a2a, 0x3a3a3a, 0x2a2a2a, 0x3a3a3a], // Alternating dark greys
    HIT_ZONE_CENTER: 0xffff00,  // Example: Yellow for hit zone centers (receptors)
    HIT_ZONE_EDGES: 0xffd700,   // Example: Gold for hit zone edges
    BACKGROUND: 0x1a1a1a,      // Dark background
    BACKGROUND_PULSE: 0x202020, // Slightly lighter for background pulse effects
    JUDGMENT_HIT: 0x00ff00,     // Green for generic hit judgments
    JUDGMENT_MISS: 0xff0000,    // Red for miss judgments
    LANE_COLORS: [0xff0000, 0x00ff00, 0xffff00, 0x0000ff], // Red, Green, Yellow, Blue
};

export const AlphaValues = {
    LANE_BACKGROUND: 0.5,
    HIT_ZONE_CENTER: 0.3,
    HIT_ZONE_EDGES: 0.5,
    BEAT_LINE: 0.2,
    NOTE_OPAQUE: 1.0,
    NOTE_TRANSLUCENT: 0.7,
};

// Gameplay Sizing Constants (ratios and fixed values)
export const GameplaySizingConstants = {
    BEAT_LINE_HEIGHT: 2,          // Height of a beat line in pixels
    HIGHWAY_WIDTH_RATIO: 0.6,     // Highway width as a ratio of total stage/canvas width
    HIT_ZONE_Y_RATIO: 0.85,       // Hit zone Y position as a ratio of total stage/canvas height (from the top)
    NOTE_HEIGHT: 20,              // Default height of a note in pixels
    HIGHWAY_LINE_THICKNESS: 1,    // Thickness of highway lane separator lines
    NOTE_WIDTH_RATIO: 0.9,        // Note width as a ratio of lane width (for some visual styles)
    RECEPTOR_AREA_HEIGHT_RATIO: 0.15, // Proportion of screen height for receptor area from bottom
    JUDGMENT_LINE_Y_OFFSET: -30, // Offset for judgment text relative to receptor Y
};

export const Timing = {
    LOOKAHEAD_SECONDS: 3.0,       // How many seconds of notes to render ahead of current time
    NOTE_RENDER_GRACE_PERIOD_MS: 500, // How long notes stay visible after passing hit line (ms)
    // Add other timing constants like hit windows (perfect, great, good, miss) in ms
    HIT_WINDOW_PERFECT_MS: 30,
    HIT_WINDOW_GREAT_MS: 60,
    HIT_WINDOW_GOOD_MS: 100,
    HIT_WINDOW_MISS_MS: 150, // Notes outside this are definite misses
};

export const DebugColors = {
    NOTE_DEBUG_BOX: 0xff00ff,     // Magenta for note debug bounding boxes
};

// If GameplaySizing from gameplayConstants was meant to be this object:
// export const GameplaySizing = GameplaySizingConstants; 