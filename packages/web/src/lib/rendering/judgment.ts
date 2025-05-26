import { JUDGMENT_HIT, JUDGMENT_MISS } from '$lib/colors';
import { Application, Container, Text, TextStyle } from 'pixi.js';

export interface JudgmentText extends Text {
    creationTime: number;
    lane: number;
    updateAnimation: (deltaMs: number) => void;
}

export function drawJudgmentText(
    app: Application,
    parentContainer: Container,
    text: string,
    lane: number,
    highwayStartX: number,
    laneWidth: number,
    yPosition: number
) {
    const style = new TextStyle({
        fontFamily: 'Arial',
        fontSize: 36,
        fill: text === 'Miss' ? JUDGMENT_MISS : JUDGMENT_HIT,
        stroke: { color: '#000000', width: 2 },
        align: 'center'
    });

    const judgmentText = new Text({ text, style }) as JudgmentText;
    judgmentText.anchor.set(0.5, 0.5);

    const laneCenterX = highwayStartX + (lane * laneWidth) + (laneWidth / 2);
    judgmentText.x = laneCenterX;
    judgmentText.y = yPosition;
    judgmentText.alpha = 1;
    judgmentText.creationTime = app.ticker.lastTime;
    judgmentText.lane = lane;
    parentContainer.addChild(judgmentText);

    const initialY = judgmentText.y;
    const animationDuration = 500; // ms
    let currentAnimationTime = 0;

    judgmentText.updateAnimation = function (deltaMs: number) {
        currentAnimationTime += deltaMs;
        const progress = Math.min(1, currentAnimationTime / animationDuration);

        this.y = initialY - progress * 30; // Moves up by 30 pixels
        this.alpha = 1 - progress; // Fades out

        // TODO: remove from parent and destroy when animation is complete
        // if (progress >= 1) {
        //     if (this.parent) {
        //         this.parent.removeChild(this);
        //     }
        //     this.destroy();
        // }
    };

    return judgmentText;
} 