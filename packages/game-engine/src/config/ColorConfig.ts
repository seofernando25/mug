export const HIGHWAY_LINE = 0x808080;
export const LANE_BACKGROUNDS = [0x9f7b19, 0x9d4401, 0x851638, 0x7f2593];
export const HIT_ZONE_CENTER = 0x444444;

export const JUDGMENT_HIT = 0x00ff00;
export const JUDGMENT_MISS = 0xff0000;
export const LANE_COLORS = [0xffd22b, 0xfe7601, 0xe52661, 0xd940f9]; // Note colors for lanes 1-4

export const LANE_BACKGROUND_ALPHA = 0.8;

export interface ColorConfig {
	highway: number;
	laneBackgrounds: number[];
	hitZoneCenter: number;
	judgmentHit: number;
	judgmentMiss: number;
	laneColors: number[];
	laneBackgroundAlpha: number;
}

export const DEFAULT_COLORS: ColorConfig = {
	highway: HIGHWAY_LINE,
	laneBackgrounds: LANE_BACKGROUNDS,
	hitZoneCenter: HIT_ZONE_CENTER,
	judgmentHit: JUDGMENT_HIT,
	judgmentMiss: JUDGMENT_MISS,
	laneColors: LANE_COLORS,
	laneBackgroundAlpha: LANE_BACKGROUND_ALPHA,
}; 