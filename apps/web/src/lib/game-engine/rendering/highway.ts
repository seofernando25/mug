import { Colors, GameplaySizingConstants } from '$lib/types'; // Changed path
import { Application, Container, Graphics } from 'pixi.js';
import { get, type Readable } from 'svelte/store';
import { LaneIllumination } from './LaneIllumination'; // Added import

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
	const initialMetrics = get(highwayMetrics); // Get initial metrics for positioning container
	highwayContainer.x = initialMetrics.x;
	highwayContainer.y = initialMetrics.y; // y is likely 0, but good practice
	parentContainer.addChild(highwayContainer);

	const mainRectsGraphics = new Graphics();
	highwayContainer.addChild(mainRectsGraphics);

	// Initialize LaneIllumination objects
	const metricsSnapshot = get(highwayMetrics); // Use a snapshot for consistent values during init
	const laneIlluminations: LaneIllumination[] = [];
	for (let i = 0; i < metricsSnapshot.numLanes; i++) {
		const illumination = new LaneIllumination(
			metricsSnapshot.laneWidth,
			metricsSnapshot.height, // Use full highway height
			Colors.LANE_COLORS[i % Colors.LANE_COLORS.length] // Use lane background color
		);
		// Position it at the start of the lane, relative to the highwayContainer
		illumination.updatePosition(i * metricsSnapshot.laneWidth, 0);
		highwayContainer.addChildAt(illumination, 0); // Add behind mainRectsGraphics and lineGraphics
		laneIlluminations.push(illumination);
	}

	const lineGraphics = new Graphics();
	highwayContainer.addChild(lineGraphics);

	const stageDims = { width: app.screen.width, height: app.screen.height }; // stageDims relative to app screen, not highway

	function _drawInternal() {
		mainRectsGraphics.clear();
		const metrics = get(highwayMetrics);
		// Update highwayContainer position if metrics.x/y can change dynamically due to resize
		highwayContainer.x = metrics.x;
		highwayContainer.y = metrics.y;

		for (let i = 0; i < metrics.numLanes; i++) {
			// Draw rects relative to highwayContainer (x is 0 for the first lane inside container)
			mainRectsGraphics.rect(i * metrics.laneWidth, 0, metrics.laneWidth, metrics.height)
				.fill({ color: Colors.LANE_BACKGROUNDS[i % Colors.LANE_BACKGROUNDS.length], alpha: Colors.LANE_BACKGROUND_ALPHA });
		}
		lineGraphics.clear();
		for (let i = 0; i < metrics.numLanes + 1; i++) {
			// Draw lines relative to highwayContainer
			const xPos = i * metrics.laneWidth;
			lineGraphics.rect(xPos - GameplaySizingConstants.HIGHWAY_LINE_THICKNESS / 2, 0, GameplaySizingConstants.HIGHWAY_LINE_THICKNESS, metrics.height)
				.fill({ color: Colors.HIGHWAY_LINE });
		}
	}

	_drawInternal();

	function triggerLaneIllumination(laneIndex: number, show: boolean): void {
		if (laneIndex >= 0 && laneIndex < laneIlluminations.length) {
			const illumination = laneIlluminations[laneIndex];
			if (show) {
				illumination.show();
			} else {
				illumination.hide();
			}
		}
	}

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
		},
		laneIlluminations, // Expose for direct access if needed
		triggerLaneIllumination // Expose the trigger function
	};
}

export function drawHighwayLines(
	lineGraphics: Graphics,
	stageHeight: number, // This might now be metrics.height
	lanes: number,
	highwayX: number, // This might be 0 if graphics are children of positioned highwayContainer
	laneWidth: number
) {
	lineGraphics.clear();
	for (let i = 0; i < lanes + 1; i++) {
		// Assuming lineGraphics is a child of highwayContainer which is already at global highwayX
		const xPos = highwayX + i * laneWidth; // If highwayX is 0 (because parent is positioned), then this is just i * laneWidth
		lineGraphics.rect(xPos - GameplaySizingConstants.HIGHWAY_LINE_THICKNESS / 2, 0, GameplaySizingConstants.HIGHWAY_LINE_THICKNESS, stageHeight)
			.fill({ color: Colors.HIGHWAY_LINE });
	}
} 