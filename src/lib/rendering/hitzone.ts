import { Colors, GameplaySizingConstants } from '$lib/types';
import { Graphics } from 'pixi.js';

export function drawHitZone(
    hitZoneGraphics: Graphics,
    stageHeight: number,
    highwayX: number,
    lanes: number,
    laneWidth: number
) {
    hitZoneGraphics.clear();
    const hitZoneYCenter = stageHeight * GameplaySizingConstants.HIT_ZONE_Y_RATIO;

    const hitCircleVisualWidth = laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
    const hitCircleRadius = hitCircleVisualWidth / 2;
    for (let i = 0; i < lanes; i++) {
        const laneCenterX = highwayX + (i * laneWidth) + (laneWidth / 2);
        hitZoneGraphics.circle(laneCenterX, hitZoneYCenter, hitCircleRadius)
            .fill({ color: Colors.HIT_ZONE_CENTER });
    }

    return { hitZoneY: hitZoneYCenter };
} 