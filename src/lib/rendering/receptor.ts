import { Graphics, Container, Application } from 'pixi.js';
import { Colors } from '$lib/game'; // Adjusted path
import type { ReceptorGraphics } from './types';

export function drawReceptor(
    app: Application, // app is unused
    parentContainer: Container,
    positions: { x: number; y: number }[],
    size: { width: number; height: number }
): ReceptorGraphics {
    const receptorContainer = new Container();
    parentContainer.addChild(receptorContainer);
    const individualReceptors: ReceptorGraphics['receptors'] = [];

    positions.forEach((pos, index) => {
        const graphics = new Graphics();
        graphics.rect(-size.width / 2, -size.height / 2, size.width, size.height)
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
                .rect(-size.width / 2, -size.height / 2, size.width, size.height)
                .fill({ color: Colors.LANE_BACKGROUNDS[index % Colors.LANE_BACKGROUNDS.length], alpha: 0.9 });
        };
        const release = () => {
            graphics.clear()
                .rect(-size.width / 2, -size.height / 2, size.width, size.height)
                .fill({ color: Colors.LANE_BACKGROUNDS[index % Colors.LANE_BACKGROUNDS.length], alpha: 0.3 });
        };

        individualReceptors.push({ graphics, flash, press, release });
    });

    const redraw = (newPositions: { x: number; y: number }[], newSize: { width: number; height: number }) => {
        individualReceptors.forEach((receptor, index) => {
            receptor.graphics.x = newPositions[index].x;
            receptor.graphics.y = newPositions[index].y;
            receptor.graphics.clear()
                .rect(-newSize.width / 2, -newSize.height / 2, newSize.width, newSize.height)
                .fill({ color: Colors.LANE_BACKGROUNDS[index % Colors.LANE_BACKGROUNDS.length], alpha: 0.3 });
        });
    };

    const destroy = () => {
        parentContainer.removeChild(receptorContainer);
        receptorContainer.destroy({ children: true });
    };

    return { container: receptorContainer, receptors: individualReceptors, redraw, destroy };
} 