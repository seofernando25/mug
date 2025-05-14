import { Graphics, Container, Application } from 'pixi.js';
import { Colors, AlphaValues, GameplaySizingConstants } from '$lib/game'; // Adjusted path
import { GameplaySizing as GameplaySizingClass } from '$lib/game'; // Adjusted path
import type { HighwayGraphics, StageDimensions } from './types';

export function drawHighway(
    app: Application,
    parentContainer: Container,
    highwayMetrics: ReturnType<typeof GameplaySizingClass.getHighwayMetrics>
): HighwayGraphics {
    const highwayContainer = new Container();
    parentContainer.addChild(highwayContainer);

    const mainRectsGraphics = new Graphics();
    highwayContainer.addChild(mainRectsGraphics);

    const lineGraphics = new Graphics();
    highwayContainer.addChild(lineGraphics);

    const stageDims = { width: app.screen.width, height: app.screen.height };

    function _drawInternal() {
        mainRectsGraphics.clear();
        for (let i = 0; i < highwayMetrics.numLanes; i++) {
            mainRectsGraphics.rect(highwayMetrics.x + i * highwayMetrics.laneWidth, 0, highwayMetrics.laneWidth, stageDims.height)
                .fill({ color: Colors.LANE_BACKGROUNDS[i % Colors.LANE_BACKGROUNDS.length], alpha: AlphaValues.LANE_BACKGROUND });
        }
        lineGraphics.clear();
        for (let i = 0; i < highwayMetrics.numLanes + 1; i++) {
            const xPos = highwayMetrics.x + i * highwayMetrics.laneWidth;
            lineGraphics.rect(xPos - GameplaySizingConstants.HIGHWAY_LINE_THICKNESS / 2, 0, GameplaySizingConstants.HIGHWAY_LINE_THICKNESS, stageDims.height)
                .fill({ color: Colors.HIGHWAY_LINE });
        }
    }

    _drawInternal();

    return {
        container: highwayContainer,
        mainRects: mainRectsGraphics,
        lines: lineGraphics,
        redraw: (newMetrics) => {
            highwayMetrics = newMetrics;
            _drawInternal();
        },
        destroy: () => {
            parentContainer.removeChild(highwayContainer);
            highwayContainer.destroy({ children: true, texture: true });
        }
    };
}

export function drawHighwayLines(
    lineGraphics: Graphics,
    stage: StageDimensions,
    lanes: number,
    highwayX: number,
    laneWidth: number
) {
    lineGraphics.clear();
    for (let i = 0; i < lanes + 1; i++) {
        const xPos = highwayX + i * laneWidth;
        lineGraphics.rect(xPos - GameplaySizingConstants.HIGHWAY_LINE_THICKNESS / 2, 0, GameplaySizingConstants.HIGHWAY_LINE_THICKNESS, stage.height)
            .fill({ color: Colors.HIGHWAY_LINE });
    }
} 