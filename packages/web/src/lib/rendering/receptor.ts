import { LANE_BACKGROUNDS, LANE_BACKGROUND_ALPHA } from '$lib/colors';
import { Container, Graphics } from 'pixi.js';
import { derived, get, type Readable } from 'svelte/store';
import type { getHighwayMetrics } from './highway';

export const DEFAULT_NOTE_HEIGHT_PROPORTION = 0.03; // 3% of canvas height

export function drawReceptor(
    parentContainer: Container,
    positions: Readable<{ x: number; y: number }[]>,
    size: Readable<{ width: number; height: number }>
) {

    const receptorContainer = new Container();
    parentContainer.addChild(receptorContainer);
    const individualReceptors: { graphics: Graphics; flash: () => void; press: () => void; release: () => void }[] = [];

    get(positions).forEach((pos, index) => {
        const graphics = new Graphics();
        graphics.rect(-get(size).width / 2, -get(size).height / 2, get(size).width, get(size).height)
            .fill({ color: '#aaaaaa', alpha: 0.5 });
        graphics.x = pos.x;
        graphics.y = pos.y;
        graphics.zIndex = 1;
        receptorContainer.addChild(graphics);

        const flash = () => {
            graphics.alpha = 1;
            setTimeout(() => { graphics.alpha = LANE_BACKGROUND_ALPHA; }, 100);
        };
        const press = () => {
            graphics.clear()
                .rect(-get(size).width / 2, -get(size).height / 2, get(size).width, get(size).height)
                .fill({ color: '#aaaaaa', alpha: 0.5 });
        };
        const release = () => {
            graphics.clear()
                .rect(-get(size).width / 2, -get(size).height / 2, get(size).width, get(size).height)
                .fill({ color: '#aaaaaa', alpha: 0.3 });
        };

        individualReceptors.push({ graphics, flash, press, release });
    });

    const redraw = () => {
        individualReceptors.forEach((receptor, index) => {
            receptor.graphics.x = get(positions)[index].x;
            receptor.graphics.y = get(positions)[index].y;
            receptor.graphics.clear()
                .rect(-get(size).width / 2, -get(size).height / 2, get(size).width, get(size).height)
                .fill({ color: LANE_BACKGROUNDS[index % LANE_BACKGROUNDS.length], alpha: LANE_BACKGROUND_ALPHA });
        });
    };

    const destroy = () => {
        parentContainer.removeChild(receptorContainer);
        receptorContainer.destroy({ children: true });
    };

    return { container: receptorContainer, receptors: individualReceptors, redraw, destroy };
}

// Get positions for each receptor
export function getReceptorPositions(highwayMetrics: Readable<ReturnType<typeof getHighwayMetrics>>) {
    return derived(highwayMetrics, (metrics) => {
        const positions = [];
        for (let i = 0; i < get(highwayMetrics).numLanes; i++) {
            positions.push({
                x: get(highwayMetrics).x + i * get(highwayMetrics).laneWidth + get(highwayMetrics).laneWidth / 2, // Center of the lane
                y: get(highwayMetrics).receptorYPosition
            });
        }
        return positions;
    });
}


// Get standard size for receptors
export function getReceptorSize(canvasWidth: number, canvasHeight: number, numLanesIfKnown?: number) {
    const lanes = numLanesIfKnown ?? 4;
    const highwayWidthProportion = lanes <= 4 ? 0.5 : lanes <= 6 ? 0.6 : 0.75;
    const totalHighwayWidth = canvasWidth * highwayWidthProportion;
    const typicalLaneWidth = totalHighwayWidth / lanes;
    const noteHeight = canvasHeight * DEFAULT_NOTE_HEIGHT_PROPORTION;

    return {
        width: typicalLaneWidth, // Receptor can be full lane width
        height: noteHeight * 1.5 // Receptors can be a bit taller than notes
    };
}
