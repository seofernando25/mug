import { Graphics, Container, Application } from 'pixi.js';
import { GameplaySizingConstants } from '$lib/game'; // Adjusted path

export function updateKeyPressVisuals(
    graphics: Graphics,
    laneActivationVisuals: Array<{ activationTime: number, currentAlpha: number }>,
    lanePressedState: boolean[],
    chartLanes: number,
    laneWidth: number,
    highwayX: number,
    hitZoneY: number,
    deltaSeconds: number,
    noteColor: number, // Should come from Colors constants
    baseRadiusRatio: number = 0.7,
    pulseRatio: number = 0.2
) {
    graphics.clear();
    const FADE_OUT_SPEED = 3.5;

    for (let i = 0; i < chartLanes; i++) {
        const visual = laneActivationVisuals[i];
        if (!visual) continue;

        if (lanePressedState[i]) {
            visual.currentAlpha = 1.0;
        } else if (visual.currentAlpha > 0) {
            visual.currentAlpha -= FADE_OUT_SPEED * deltaSeconds;
            if (visual.currentAlpha < 0) visual.currentAlpha = 0;
        }

        if (visual.currentAlpha > 0) {
            const laneCenterX = highwayX + i * laneWidth + laneWidth / 2;

            const effectBaseRadius = (laneWidth * GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5) * baseRadiusRatio;
            const animatedRadius = effectBaseRadius * (1 + visual.currentAlpha * pulseRatio);

            graphics.circle(laneCenterX, hitZoneY, animatedRadius)
                .fill({ color: noteColor, alpha: visual.currentAlpha * 0.6 });
        }
    }
}

export function drawKeyPressEffects(
    parentContainer: Container,
    numLanes: number
) {
    const effectsContainer = new Container();
    parentContainer.addChild(effectsContainer);
    const pressGraphics = new Graphics();
    effectsContainer.addChild(pressGraphics);

    const laneDataArray = new Array(numLanes).fill(null).map(() => ({ activationTime: 0, currentAlpha: 0 }));

    return {
        container: effectsContainer,
        visuals: pressGraphics,
        laneData: laneDataArray,
        redraw: () => {
            // Redraw logic might be needed if receptors move or resize
        },
        destroy: () => {
            parentContainer.removeChild(effectsContainer);
            effectsContainer.destroy({ children: true, texture: true });
        }
    };
} 