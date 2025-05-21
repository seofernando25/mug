import { Graphics, Container, Application } from 'pixi.js';
import { Colors } from '$lib/game'; // Adjusted path
import { get, type Readable } from 'svelte/store';

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
            .fill({ color: Colors.LANE_BACKGROUNDS[index % Colors.LANE_BACKGROUNDS.length], alpha: 0.3 });
        graphics.x = pos.x;
        graphics.y = pos.y;
        receptorContainer.addChild(graphics);

        const flash = () => {
            graphics.alpha = 1;
            setTimeout(() => { graphics.alpha = 0.7; }, 100); // Consider using a tweening library or app.ticker for animations
        };
        const press = () => {
            graphics.clear()
                .rect(-get(size).width / 2, -get(size).height / 2, get(size).width, get(size).height)
                .fill({ color: Colors.LANE_BACKGROUNDS[index % Colors.LANE_BACKGROUNDS.length], alpha: 0.9 });
        };
        const release = () => {
            graphics.clear()
                .rect(-get(size).width / 2, -get(size).height / 2, get(size).width, get(size).height)
                .fill({ color: Colors.LANE_BACKGROUNDS[index % Colors.LANE_BACKGROUNDS.length], alpha: 0.3 });
        };

        individualReceptors.push({ graphics, flash, press, release });
    });

    const redraw = () => {
        individualReceptors.forEach((receptor, index) => {
            receptor.graphics.x = get(positions)[index].x;
            receptor.graphics.y = get(positions)[index].y;
            receptor.graphics.clear()
                .rect(-get(size).width / 2, -get(size).height / 2, get(size).width, get(size).height)
                .fill({ color: Colors.LANE_BACKGROUNDS[index % Colors.LANE_BACKGROUNDS.length], alpha: 0.3 });
        });
    };

    const destroy = () => {
        parentContainer.removeChild(receptorContainer);
        receptorContainer.destroy({ children: true });
    };

    return { container: receptorContainer, receptors: individualReceptors, redraw, destroy };
} 