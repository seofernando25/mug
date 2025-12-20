import { Colors, GameplaySizingConstants } from './constants';
import { type Application, Container, Graphics } from 'pixi.js';
import { get, type Readable } from 'svelte/store';
import { LaneIllumination } from './LaneIllumination';

const DEFAULT_RECEPTOR_AREA_HEIGHT_PROPORTION = 0.15;

export function getHighwayMetrics(numLanes: number, canvasWidth: number, canvasHeight: number) {
	const highwayWidthProportion = numLanes <= 4 ? 0.5 : numLanes <= 6 ? 0.6 : 0.75;
	const totalHighwayWidth = canvasWidth * highwayWidthProportion;
	const laneWidth = totalHighwayWidth / numLanes;
	const receptorY = canvasHeight * (1 - DEFAULT_RECEPTOR_AREA_HEIGHT_PROPORTION);

	return {
		x: (canvasWidth - totalHighwayWidth) / 2,
		y: 0,
		width: totalHighwayWidth,
		height: canvasHeight,
		numLanes: numLanes,
		laneWidth: laneWidth,
		receptorYPosition: receptorY,
		judgmentLineYPosition: receptorY - canvasHeight * 0.05
	};
}

export function drawHighway(
	_app: Application,
	parentContainer: Container,
	highwayMetrics: Readable<ReturnType<typeof getHighwayMetrics>>
) {
	const highwayContainer = new Container();
	const initialMetrics = get(highwayMetrics);
	highwayContainer.x = initialMetrics.x;
	highwayContainer.y = initialMetrics.y;
	parentContainer.addChild(highwayContainer);

	const mainRectsGraphics = new Graphics();
	highwayContainer.addChild(mainRectsGraphics);

	const metricsSnapshot = get(highwayMetrics);
	const laneIlluminations: LaneIllumination[] = [];
	for (let i = 0; i < metricsSnapshot.numLanes; i++) {
		const illumination = new LaneIllumination(
			metricsSnapshot.laneWidth,
			metricsSnapshot.height,
			Colors.LANE_COLORS[i % Colors.LANE_COLORS.length]
		);
		illumination.updatePosition(i * metricsSnapshot.laneWidth, 0);
		highwayContainer.addChildAt(illumination, 0);
		laneIlluminations.push(illumination);
	}

	const lineGraphics = new Graphics();
	highwayContainer.addChild(lineGraphics);

	function _drawInternal() {
		mainRectsGraphics.clear();
		const metrics = get(highwayMetrics);
		highwayContainer.x = metrics.x;
		highwayContainer.y = metrics.y;

		for (let i = 0; i < metrics.numLanes; i++) {
			mainRectsGraphics.rect(i * metrics.laneWidth, 0, metrics.laneWidth, metrics.height).fill({
				color: Colors.LANE_BACKGROUNDS[i % Colors.LANE_BACKGROUNDS.length],
				alpha: Colors.LANE_BACKGROUND_ALPHA
			});
		}
		lineGraphics.clear();
		for (let i = 0; i < metrics.numLanes + 1; i++) {
			const xPos = i * metrics.laneWidth;
			lineGraphics
				.rect(
					xPos - GameplaySizingConstants.HIGHWAY_LINE_THICKNESS / 2,
					0,
					GameplaySizingConstants.HIGHWAY_LINE_THICKNESS,
					metrics.height
				)
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
		laneIlluminations,
		triggerLaneIllumination
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
		lineGraphics
			.rect(
				xPos - GameplaySizingConstants.HIGHWAY_LINE_THICKNESS / 2,
				0,
				GameplaySizingConstants.HIGHWAY_LINE_THICKNESS,
				stageHeight
			)
			.fill({ color: Colors.HIGHWAY_LINE });
	}
}
