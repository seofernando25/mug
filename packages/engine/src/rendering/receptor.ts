import { Colors } from "./constants";
import { Container, Graphics } from "pixi.js";
import { derived, get, type Readable } from "svelte/store";
import type { getHighwayMetrics } from "./highway";

export const DEFAULT_NOTE_HEIGHT_PROPORTION = 0.03; // 3% of canvas height

export function drawReceptor(
	parentContainer: Container,
	positions: Readable<{ x: number; y: number }[]>,
	size: Readable<{ width: number; height: number }>,
) {
	const receptorContainer = new Container();
	parentContainer.addChild(receptorContainer);
	const individualReceptors: {
		graphics: Graphics;
		flash: () => void;
		press: () => void;
		release: () => void;
	}[] = [];

	const redraw = () => {
		const currentPositions = get(positions);
		const currentSize = get(size);
		
		individualReceptors.forEach((receptor, index) => {
			const pos = currentPositions[index];
			if (!pos) return;

			receptor.graphics.x = pos.x;
			receptor.graphics.y = pos.y;

			// Match GameNote width (90% of lane)
			const width = currentSize.width * 0.9;
			const height = 30; // Match GameNote height approximately

			const laneColor =
				Colors.LANE_COLORS[index % Colors.LANE_COLORS.length];

			receptor.graphics.clear();
			
			// Receptor Frame
			receptor.graphics
				.rect(-width / 2, -height / 2, width, height)
				.stroke({ width: 4, color: laneColor, alpha: 0.5 })
				.fill({ color: 0x000000, alpha: 0.3 }); // Dark background for contrast
		});
	};

	get(positions).forEach((pos, index) => {
		const graphics = new Graphics();
		graphics.x = pos.x;
		graphics.y = pos.y;
		graphics.zIndex = 1;
		receptorContainer.addChild(graphics);

		const laneColor = Colors.LANE_COLORS[index % Colors.LANE_COLORS.length];

		const flash = () => {
			const s = get(size);
			const width = s.width * 0.9;
			const height = 30;
			
			// Bright flash on hit
			graphics
				.clear()
				.rect(-width / 2, -height / 2, width, height)
				.stroke({ width: 4, color: laneColor, alpha: 1 })
				.fill({ color: laneColor, alpha: 0.6 });

			setTimeout(() => {
				// Revert to default state
				if (graphics.destroyed) return;
				graphics
					.clear()
					.rect(-width / 2, -height / 2, width, height)
					.stroke({ width: 4, color: laneColor, alpha: 0.5 })
					.fill({ color: 0x000000, alpha: 0.3 });
			}, 100);
		};

		const press = () => {
			const s = get(size);
			const width = s.width * 0.9;
			const height = 30;
			// Pressed state (held down)
			graphics
				.clear()
				.rect(-width / 2, -height / 2, width * 0.95, height * 0.95) // Slight shrink effect
				.stroke({ width: 4, color: laneColor, alpha: 1 })
				.fill({ color: laneColor, alpha: 0.4 });
		};

		const release = () => {
			const s = get(size);
			const width = s.width * 0.9;
			const height = 30;
			// Back to default
			graphics
				.clear()
				.rect(-width / 2, -height / 2, width, height)
				.stroke({ width: 4, color: laneColor, alpha: 0.5 })
				.fill({ color: 0x000000, alpha: 0.3 });
		};

		individualReceptors.push({ graphics, flash, press, release });
	});

	// Initial draw
	redraw();

	// Set up subscriptions for reactivity
	const unsubPositions = positions.subscribe(() => redraw());
	const unsubSize = size.subscribe(() => redraw());

	const destroy = () => {
		unsubPositions();
		unsubSize();
		parentContainer.removeChild(receptorContainer);
		receptorContainer.destroy({ children: true });
	};

	return {
		container: receptorContainer,
		receptors: individualReceptors,
		redraw,
		destroy,
	};
}

// Get positions for each receptor
export function getReceptorPositions(
	highwayMetrics: Readable<ReturnType<typeof getHighwayMetrics>>,
) {
	return derived(highwayMetrics, (m) => {
		const positions = [];
		for (let i = 0; i < m.numLanes; i++) {
			positions.push({
				x:
					m.x +
					i * m.laneWidth +
					m.laneWidth / 2, // Center of the lane
				y: m.receptorYPosition,
			});
		}
		return positions;
	});
}

// Get standard size for receptors
export function getReceptorSize(
	canvasWidth: number,
	canvasHeight: number,
	numLanesIfKnown?: number,
) {
	const lanes = numLanesIfKnown ?? 4;
	const highwayWidthProportion = lanes <= 4 ? 0.5 : lanes <= 6 ? 0.6 : 0.75;
	const totalHighwayWidth = canvasWidth * highwayWidthProportion;
	const typicalLaneWidth = totalHighwayWidth / lanes;

	return {
		width: typicalLaneWidth,
		height: 30, 
	};
}
