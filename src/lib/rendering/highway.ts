import { AlphaValues, Colors, GameplaySizingConstants } from '$lib/game'; // Adjusted path
import { Application, Container, Graphics } from 'pixi.js';
import { get, type Readable } from 'svelte/store';

const DEFAULT_RECEPTOR_AREA_HEIGHT_PROPORTION = 0.15; // 15% of canvas height from bottom

// Get metrics for the note highway
export function getHighwayMetrics(numLanes: number, canvasWidth: number, canvasHeight: number) {
    // Use provided canvas dimensions, or fall back to defaults
    const effectiveCanvasWidth = canvasWidth;
    const effectiveCanvasHeight = canvasHeight;

    // Make lane width responsive, e.g., 1/8th of canvas width for a 4-lane setup,
    // but ensure it's not excessively wide or narrow. Max of 100px, min of 60px for example.
    // Or, a certain percentage of total width dedicated to highway.
    // Let's say highway takes up 50% of canvas width for 4 lanes, 60% for 6 lanes, etc.
    const highwayWidthProportion = numLanes <= 4 ? 0.5 : numLanes <= 6 ? 0.6 : 0.75;
    const totalHighwayWidth = effectiveCanvasWidth * highwayWidthProportion;
    const laneWidth = totalHighwayWidth / numLanes;

    const receptorY = effectiveCanvasHeight * (1 - DEFAULT_RECEPTOR_AREA_HEIGHT_PROPORTION);

    return {
        x: (effectiveCanvasWidth - totalHighwayWidth) / 2, // Centered highway
        y: 0,
        width: totalHighwayWidth,
        height: effectiveCanvasHeight,
        numLanes: numLanes,
        laneWidth: laneWidth,
        receptorYPosition: receptorY,
        judgmentLineYPosition: receptorY - (effectiveCanvasHeight * 0.05) // Judgment text 5% of canvas height above receptors
    };
}

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