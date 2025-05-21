import type { ChartHitObject } from '$lib/types';
import { AlphaValues, Colors, GameplaySizingConstants, Timing } from '$lib/types';
import { Application, Container, Graphics } from 'pixi.js';

// Calculate Y position of a note on the screen
export function getNoteYPosition(
    noteTimeMs: number,
    currentTimeMs: number,
    receptorYPosition: number,
    speedMultiplier: number, // User's preferred speed setting
    canvasHeight: number
): number {
    // const effectiveCanvasHeight = canvasHeight ?? DEFAULT_FALLBACK_CANVAS_HEIGHT;
    // pixelsPerSecondBase could be a fraction of effectiveCanvasHeight to make scroll speed responsive to screen size.
    // e.g., pixelsPerSecondBase = effectiveCanvasHeight * 0.5; (meaning notes visible for 2 seconds at 1x speed)
    const pixelsPerSecondBase = canvasHeight * 0.6; // Travels 60% of screen height per second at 1x
    const timeDifferenceSeconds = (noteTimeMs - currentTimeMs) / 1000;
    const effectiveScrollSpeed = pixelsPerSecondBase * speedMultiplier;
    return receptorYPosition - (timeDifferenceSeconds * effectiveScrollSpeed);
}


export type NoteGraphicsEntry = ReturnType<typeof getNoteGraphics>;
export function updateNotes(
    songTimeMs: number,
    pixiStage: Container,
    highwayX: number,
    laneWidth: number,
    hitZoneY: number,
    scrollSpeed: number,
    canvasHeight: number,
    sortedHitObjects: Array<ChartHitObject>,
    currentNoteGraphicsMap: Map<number, NoteGraphicsEntry>,
    judgedNoteIds: ReadonlySet<number>
): Map<number, NoteGraphicsEntry> {
    const newNoteGraphicsMap = new Map(currentNoteGraphicsMap);

    const lookaheadMs = Timing.LOOKAHEAD_SECONDS * 1000;
    const minVisibleTime = songTimeMs - Timing.NOTE_RENDER_GRACE_PERIOD_MS;
    const maxVisibleTime = songTimeMs + lookaheadMs;

    sortedHitObjects.forEach(noteData => {
        const noteId = noteData.id;
        let graphicsEntry = newNoteGraphicsMap.get(noteId);

        if (judgedNoteIds.has(noteId)) {
            if (graphicsEntry) {
                if (graphicsEntry.headGraphics.parent) graphicsEntry.headGraphics.parent.removeChild(graphicsEntry.headGraphics);
                graphicsEntry.headGraphics.destroy();
                if (graphicsEntry.bodyGraphics) {
                    if (graphicsEntry.bodyGraphics.parent) graphicsEntry.bodyGraphics.parent.removeChild(graphicsEntry.bodyGraphics);
                    graphicsEntry.bodyGraphics.destroy();
                }
                newNoteGraphicsMap.delete(noteId);
            }
            return;
        }

        const noteStartTime = noteData.time;
        const currentDuration = noteData.duration ?? undefined;
        const noteEndTime = noteData.time + (currentDuration ?? 0);

        if (noteStartTime <= maxVisibleTime && noteEndTime >= minVisibleTime) {
            if (!graphicsEntry) {
                const { headGraphics, bodyGraphics } = createSingleNoteGraphics(noteData, laneWidth);
                graphicsEntry = {
                    id: noteData.id,
                    headGraphics,
                    bodyGraphics,
                    lane: noteData.lane,
                    time: noteData.time,
                    duration: currentDuration,
                    note_type: noteData.note_type,
                    isHit: false
                };
                newNoteGraphicsMap.set(noteId, graphicsEntry);
                if (bodyGraphics) pixiStage.addChild(bodyGraphics);
                pixiStage.addChild(headGraphics);
                repositionNoteGraphics(graphicsEntry, noteData, highwayX, laneWidth, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);
            } else {
                repositionNoteGraphics(graphicsEntry, noteData, highwayX, laneWidth, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);
            }
        } else {
            if (graphicsEntry) {
                if (graphicsEntry.headGraphics.parent) graphicsEntry.headGraphics.parent.removeChild(graphicsEntry.headGraphics);
                graphicsEntry.headGraphics.destroy();
                if (graphicsEntry.bodyGraphics) {
                    if (graphicsEntry.bodyGraphics.parent) graphicsEntry.bodyGraphics.parent.removeChild(graphicsEntry.bodyGraphics);
                    graphicsEntry.bodyGraphics.destroy();
                }
                newNoteGraphicsMap.delete(noteId);
            }
        }
    });

    return newNoteGraphicsMap;
}

function createSingleNoteGraphics(
    noteData: ChartHitObject,
    laneWidth: number
): { headGraphics: Graphics, bodyGraphics?: Graphics } {
    const headGraphics = new Graphics();
    const noteVisualWidth = laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
    const noteRadius = noteVisualWidth / 2;

    const noteColor = noteData.note_type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP;
    headGraphics.circle(0, 0, noteRadius).fill({ color: noteColor, alpha: AlphaValues.NOTE_IDLE });

    let bodyGraphics: Graphics | undefined;
    if (noteData.note_type === 'hold' && (noteData.duration ?? 0) > 0) {
        bodyGraphics = new Graphics();
        const bodyWidth = noteVisualWidth * 0.5;
        bodyGraphics.rect(-bodyWidth / 2, 0, bodyWidth, 1)
            .fill({ color: Colors.NOTE_HOLD_BODY, alpha: AlphaValues.NOTE_IDLE * 0.7 });
    }

    return { headGraphics, bodyGraphics };
}

function repositionNoteGraphics(
    graphicsEntry: NoteGraphicsEntry,
    noteData: ChartHitObject,
    highwayX: number,
    laneWidth: number,
    songTimeMs: number,
    hitZoneY: number,
    scrollSpeed: number,
    canvasHeight: number
) {
    const { headGraphics, bodyGraphics, time, duration, note_type, lane } = graphicsEntry;
    const currentDuration = duration ?? 0;
    const laneCenterX = highwayX + (lane * laneWidth) + (laneWidth / 2);

    const idealHeadY = getNoteYPosition(time, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);

    headGraphics.x = laneCenterX;
    headGraphics.y = idealHeadY;

    if (bodyGraphics && note_type === 'hold' && currentDuration > 0) {
        bodyGraphics.x = laneCenterX;
        bodyGraphics.y = idealHeadY;

        const noteEndTime = time + currentDuration;
        const idealTailY = getNoteYPosition(noteEndTime, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);
        const bodyHeight = idealHeadY - idealTailY;

        bodyGraphics.clear();
        const noteVisualWidth = laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
        const bodyWidth = noteVisualWidth * 0.5;
        bodyGraphics.rect(-bodyWidth / 2, -bodyHeight, bodyWidth, bodyHeight)
            .fill({ color: Colors.NOTE_HOLD_BODY, alpha: AlphaValues.NOTE_IDLE * 0.7 });
    }
}

export function redrawNoteGraphicsOnResize(
    noteGraphicsMap: Map<number, NoteGraphicsEntry>,
    highwayX: number,
    laneWidth: number,
    songTimeMs: number,
    hitZoneY: number,
    scrollSpeed: number,
    canvasHeight: number
) {
    noteGraphicsMap.forEach((noteGfx) => {
        const { headGraphics, bodyGraphics, lane, note_type, duration, time } = noteGfx;
        const currentDuration = duration ?? 0;

        const currentLaneX = highwayX + (lane * laneWidth) + (laneWidth / 2);
        headGraphics.x = currentLaneX;

        const idealHeadY = getNoteYPosition(time, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);
        headGraphics.y = idealHeadY;

        const noteVisualWidth = laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
        headGraphics.clear();

        const noteColor = note_type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP;
        headGraphics.circle(0, 0, noteVisualWidth / 2).fill({ color: noteColor, alpha: AlphaValues.NOTE_IDLE });

        if (bodyGraphics && currentDuration > 0 && note_type === 'hold') {
            bodyGraphics.x = currentLaneX;
            bodyGraphics.y = headGraphics.y;
            const noteEndTime = time + currentDuration;
            const idealTailY = getNoteYPosition(noteEndTime, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);
            const bodyHeight = idealHeadY - idealTailY;
            const bodyWidth = noteVisualWidth * 0.5;
            bodyGraphics.clear();
            bodyGraphics.rect(-bodyWidth / 2, -bodyHeight, bodyWidth, bodyHeight).fill({ color: Colors.NOTE_HOLD_BODY, alpha: AlphaValues.NOTE_IDLE * 0.7 });
        }
    });
}

export function getNoteGraphics(initialProps: {
    hitObject: ChartHitObject;
    laneWidth: number;
    noteHeight: number;
    holdBodyHeight?: number;
}) {
    const { headGraphics, bodyGraphics } = createSingleNoteGraphics(initialProps.hitObject, initialProps.laneWidth);
    const tempId = (initialProps.hitObject).id || Date.now() + Math.random();

    const graphicsEntry = {
        id: tempId,
        headGraphics,
        bodyGraphics,
        lane: initialProps.hitObject.lane,
        time: initialProps.hitObject.time,
        duration: initialProps.hitObject.duration ?? undefined,
        note_type: initialProps.hitObject.note_type,
        isHit: false
    };
    return graphicsEntry;
}

export function createNoteGraphicsPool(
    app: Application,
    poolSize: number,
    sampleHitObject: ChartHitObject & { id: number },
    laneWidth: number
): NoteGraphicsEntry[] {
    const pool: NoteGraphicsEntry[] = [];
    for (let i = 0; i < poolSize; i++) {
        const { headGraphics, bodyGraphics } = createSingleNoteGraphics(sampleHitObject, laneWidth);
        headGraphics.visible = false;
        if (bodyGraphics) bodyGraphics.visible = false;

        pool.push({
            id: sampleHitObject.id + i,
            headGraphics,
            bodyGraphics,
            lane: sampleHitObject.lane,
            time: sampleHitObject.time,
            duration: sampleHitObject.duration ?? undefined,
            note_type: sampleHitObject.note_type,
            isHit: false,
        });
    }
    return pool;
}

