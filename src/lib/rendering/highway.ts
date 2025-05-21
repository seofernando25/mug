import { AlphaValues, Colors, GameplaySizingConstants, getHighwayMetrics } from '$lib/game'; // Adjusted path
import { Application, Container, Graphics } from 'pixi.js';
import { get, type Readable } from 'svelte/store';

export function drawHighway(
    app: Application,
    parentContainer: Container,
    highwayMetrics: Readable<ReturnType<typeof getHighwayMetrics>>
) {
    const highwayContainer = new Container();
    parentContainer.addChild(highwayContainer);

    const mainRectsGraphics = new Graphics();
    highwayContainer.addChild(mainRectsGraphics);

    const lineGraphics = new Graphics();
    highwayContainer.addChild(lineGraphics);

    const stageDims = { width: app.screen.width, height: app.screen.height };

    function _drawInternal() {
        mainRectsGraphics.clear();
        const metrics = get(highwayMetrics);
        for (let i = 0; i < metrics.numLanes; i++) {
            mainRectsGraphics.rect(metrics.x + i * metrics.laneWidth, 0, metrics.laneWidth, stageDims.height)
                .fill({ color: Colors.LANE_BACKGROUNDS[i % Colors.LANE_BACKGROUNDS.length], alpha: AlphaValues.LANE_BACKGROUND });
        }
        lineGraphics.clear();
        for (let i = 0; i < metrics.numLanes + 1; i++) {
            const xPos = metrics.x + i * metrics.laneWidth;
            lineGraphics.rect(xPos - GameplaySizingConstants.HIGHWAY_LINE_THICKNESS / 2, 0, GameplaySizingConstants.HIGHWAY_LINE_THICKNESS, stageDims.height)
                .fill({ color: Colors.HIGHWAY_LINE });
        }
    }

    _drawInternal();

    return {
        container: highwayContainer,
        mainRects: mainRectsGraphics,
        lines: lineGraphics,
        redraw: () => {
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
    stageHeight: number,
    lanes: number,
    highwayX: number,
    laneWidth: number
) {
    lineGraphics.clear();
    for (let i = 0; i < lanes + 1; i++) {
        const xPos = highwayX + i * laneWidth;
        lineGraphics.rect(xPos - GameplaySizingConstants.HIGHWAY_LINE_THICKNESS / 2, 0, GameplaySizingConstants.HIGHWAY_LINE_THICKNESS, stageHeight)
            .fill({ color: Colors.HIGHWAY_LINE });
    }
} 