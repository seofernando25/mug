import { Application, Container, Text, TextStyle } from 'pixi.js';
import { Colors } from '$lib/game'; // Adjusted path
import { GameplaySizing as GameplaySizingClass } from '$lib/game'; // Adjusted path
import type { JudgmentText } from './types';

export function drawJudgmentText(
    app: Application,
    parentContainer: Container,
    text: string,
    lane: number, 
    highwayStartX: number, // New: X position of the highway's start
    laneWidth: number,     // New: Width of a single lane
    yPosition: number
): JudgmentText {
    const style = new TextStyle({
        fontFamily: 'Arial',
        fontSize: 36,
        fill: text === 'Miss' ? Colors.JUDGMENT_MISS : Colors.JUDGMENT_HIT, // Ensure JUDGMENT_MISS and JUDGMENT_HIT are in Colors
        stroke: { color: '#000000', width: 2 },
        align: 'center'
    });

    const judgmentText = new Text({ text, style }) as JudgmentText;
    judgmentText.anchor.set(0.5, 0.5);

    // Calculate X position based on the lane, highwayStartX, and laneWidth
    const laneCenterX = highwayStartX + (lane * laneWidth) + (laneWidth / 2);
    judgmentText.x = laneCenterX;
    // Fallback removed as we now require highwayStartX and laneWidth

    judgmentText.y = yPosition;
    judgmentText.alpha = 1;
    judgmentText.creationTime = app.ticker.lastTime; // Using app.ticker.lastTime for creationTime
    judgmentText.lane = lane;
    parentContainer.addChild(judgmentText);

    const initialY = judgmentText.y;
    const animationDuration = 500; // ms
    let currentAnimationTime = 0;

    // Make updateAnimation a method of the returned object
    judgmentText.updateAnimation = function (deltaMs: number) {
        currentAnimationTime += deltaMs;
        const progress = Math.min(1, currentAnimationTime / animationDuration);

        this.y = initialY - progress * 30; // Moves up by 30 pixels
        this.alpha = 1 - progress; // Fades out

        // Optional: remove from parent and destroy when animation is complete
        // if (progress >= 1) {
        //     if (this.parent) {
        //         this.parent.removeChild(this);
        //     }
        //     this.destroy();
        // }
    };

    return judgmentText;
} 