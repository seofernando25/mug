import { Graphics, Container, Application } from 'pixi.js';
import { Colors, AlphaValues, GameplaySizingConstants } from '$lib/game'; // Adjusted path
import type { BeatLineEntry, BeatLineGraphics, StageDimensions } from './types';
import type { GameplaySizing as GameplaySizingClass } from '$lib/game'; // Adjusted path

export function redrawBeatLineGraphicsOnResize(
    beatLines: BeatLineEntry[],
    highwayX: number,
    highwayWidth: number
) {
    beatLines.forEach(lineData => {
        lineData.graphics.clear();
        lineData.graphics.rect(
            highwayX,
            -GameplaySizingConstants.BEAT_LINE_HEIGHT / 2,
            highwayWidth,
            GameplaySizingConstants.BEAT_LINE_HEIGHT
        ).fill({ color: Colors.BEAT_LINE, alpha: AlphaValues.BEAT_LINE });
    });
}

export function updateBeatLines(
    currentSongTimeSeconds: number,
    bpm: number,
    scrollSpeed: number,
    deltaSeconds: number,
    stage: StageDimensions,
    highwayX: number,
    highwayWidth: number,
    playheadY: number,
    existingBeatLines: BeatLineEntry[],
    pixiStage: Container
): BeatLineEntry[] {
    const beatIntervalSeconds = (60 / bpm);
    let newBeatLinesArray = [...existingBeatLines];

    const stillVisibleLines: BeatLineEntry[] = [];
    for (const lineData of newBeatLinesArray) {
        lineData.graphics.y += scrollSpeed * deltaSeconds;

        const timeDifferenceFromPlayhead = lineData.beatTime - currentSongTimeSeconds;
        const idealY = playheadY - (timeDifferenceFromPlayhead * scrollSpeed);

        const interpolationFactor = 0.2;
        lineData.graphics.y += (idealY - lineData.graphics.y) * interpolationFactor;

        const isOffScreenBottom = lineData.graphics.y > stage.height + GameplaySizingConstants.BEAT_LINE_HEIGHT * 5;
        const isTooFarInPast = currentSongTimeSeconds - lineData.beatTime > 5.0;

        if (isOffScreenBottom || isTooFarInPast) {
            pixiStage.removeChild(lineData.graphics);
            lineData.graphics.destroy();
        } else {
            stillVisibleLines.push(lineData);
        }
    }
    newBeatLinesArray = stillVisibleLines;

    const timeTopToPlayhead = playheadY / scrollSpeed;
    const furthestBeatTimeToSpawn = currentSongTimeSeconds + timeTopToPlayhead + beatIntervalSeconds;

    let lastKnownBeatTime = -beatIntervalSeconds;
    if (newBeatLinesArray.length > 0) {
        lastKnownBeatTime = newBeatLinesArray.reduce((max, line) => Math.max(max, line.beatTime), -Infinity);
        if (lastKnownBeatTime === -Infinity) lastKnownBeatTime = -beatIntervalSeconds;
    } else {
        const earliestOnScreenBeatTime = currentSongTimeSeconds + ((playheadY - stage.height) / scrollSpeed);
        lastKnownBeatTime = Math.floor(earliestOnScreenBeatTime / beatIntervalSeconds) * beatIntervalSeconds - beatIntervalSeconds;
    }

    const linesToAddThisFrame: BeatLineEntry[] = [];
    let nextBeatCandidateTime = (Math.floor(lastKnownBeatTime / beatIntervalSeconds) + 1) * beatIntervalSeconds;

    while (nextBeatCandidateTime <= furthestBeatTimeToSpawn) {
        if (nextBeatCandidateTime >= -0.001) {
            const newBeatLineGraphics = new Graphics();
            newBeatLineGraphics.rect(
                highwayX,
                -GameplaySizingConstants.BEAT_LINE_HEIGHT / 2,
                highwayWidth,
                GameplaySizingConstants.BEAT_LINE_HEIGHT
            ).fill({ color: Colors.BEAT_LINE, alpha: AlphaValues.BEAT_LINE });

            const timeDiffInitial = nextBeatCandidateTime - currentSongTimeSeconds;
            newBeatLineGraphics.y = playheadY - (timeDiffInitial * scrollSpeed);

            pixiStage.addChild(newBeatLineGraphics);
            linesToAddThisFrame.push({ graphics: newBeatLineGraphics, beatTime: nextBeatCandidateTime });
        }
        nextBeatCandidateTime += beatIntervalSeconds;
    }

    if (linesToAddThisFrame.length > 0) {
        newBeatLinesArray = [...newBeatLinesArray, ...linesToAddThisFrame];
        newBeatLinesArray.sort((a, b) => a.beatTime - b.beatTime);
    }

    return newBeatLinesArray;
}

export function drawBeatLines(
    app: Application,
    parentContainer: Container,
    highwayMetrics: ReturnType<typeof GameplaySizingClass.getHighwayMetrics>,
    initialBeats: any[], // Consider typing this more strictly if possible
    initialSongTimeMs: number,
    initialBpm: number,
    speedMultiplier: number,
    existingGraphics?: BeatLineGraphics
): BeatLineGraphics {
    if (existingGraphics) {
        existingGraphics.destroy();
    }
    const beatLineContainer = new Container();
    parentContainer.addChild(beatLineContainer);

    // TODO: The actual drawing/setup logic for initial beat lines needs to be implemented or clarified.
    // This function, as moved, currently only sets up a container and returns it.
    // The original `updateBeatLines` handles the dynamic creation and positioning.

    return {
        container: beatLineContainer,
        lines: [], // Should probably be populated based on initialBeats, initialSongTimeMs, etc.
        destroy: () => {
            parentContainer.removeChild(beatLineContainer);
            beatLineContainer.destroy({ children: true, texture: true });
        }
    };
} 