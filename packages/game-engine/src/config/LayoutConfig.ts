export const NOTE_WIDTH_RATIO = 0.9;
export const HIT_ZONE_Y_RATIO = 0.85;
export const HIGHWAY_LINE_THICKNESS = 0.6;

export interface LayoutConfig {
	noteWidthRatio: number;
	hitZoneYRatio: number;
	highwayLineThickness: number;
}

export const DEFAULT_LAYOUT: LayoutConfig = {
	noteWidthRatio: NOTE_WIDTH_RATIO,
	hitZoneYRatio: HIT_ZONE_Y_RATIO,
	highwayLineThickness: HIGHWAY_LINE_THICKNESS,
}; 