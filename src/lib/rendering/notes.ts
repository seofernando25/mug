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

// Updated to include tailGraphics
export type NoteGraphicsEntry = {
    id: number;
    headGraphics: Graphics;
    bodyGraphics?: Graphics;
    tailGraphics?: Graphics; // Added for hold note tails
    lane: number;
    time: number;
    duration?: number;
    note_type: 'tap' | 'hold';
    isHit: boolean; // This property might be from an old approach, GameplayNote in game.ts handles state
};

export function updateNotes(
    songTimeMs: number,
    pixiStage: Container,
    highwayX: number,
    laneWidth: number,
    hitZoneY: number,
    scrollSpeed: number,
    canvasHeight: number,
    sortedHitObjects: Array<ChartHitObject & { isActivelyHeld?: boolean }>,
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
                graphicsEntry.headGraphics.destroy(true);
                if (graphicsEntry.bodyGraphics) graphicsEntry.bodyGraphics.destroy(true);
                if (graphicsEntry.tailGraphics) graphicsEntry.tailGraphics.destroy(true); // Destroy tail
                newNoteGraphicsMap.delete(noteId);
            }
            return;
        }

        const noteStartTime = noteData.time;
        const currentDuration = noteData.duration ?? 0; // Ensure duration is a number
        const noteEndTime = noteData.time + currentDuration;

        // Note should be visible if its start time is before maxVisible OR its end time is after minVisible
        if (noteStartTime <= maxVisibleTime && noteEndTime >= minVisibleTime) {
            if (!graphicsEntry) {
                const { headGraphics, bodyGraphics, tailGraphics } = createSingleNoteGraphics(noteData, laneWidth);
                graphicsEntry = {
                    id: noteData.id,
                    headGraphics,
                    bodyGraphics,
                    tailGraphics, // Add tail
                    lane: noteData.lane,
                    time: noteData.time,
                    duration: currentDuration,
                    note_type: noteData.note_type,
                    isHit: false // This state is primarily managed in game.ts's GameplayNote
                };
                newNoteGraphicsMap.set(noteId, graphicsEntry);
                // Add in specific order for potential z-index benefits (body, then tail, then head)
                if (bodyGraphics) pixiStage.addChild(bodyGraphics);
                if (tailGraphics) pixiStage.addChild(tailGraphics); // Add tail to stage
                pixiStage.addChild(headGraphics);
                // Initial position set here
                repositionNoteGraphics(graphicsEntry, noteData, highwayX, laneWidth, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);
            } else {
                // Update existing note's position
                repositionNoteGraphics(graphicsEntry, noteData, highwayX, laneWidth, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);
            }
        } else { // Note is not visible
            if (graphicsEntry) {
                graphicsEntry.headGraphics.destroy(true);
                if (graphicsEntry.bodyGraphics) graphicsEntry.bodyGraphics.destroy(true);
                if (graphicsEntry.tailGraphics) graphicsEntry.tailGraphics.destroy(true); // Destroy tail
                newNoteGraphicsMap.delete(noteId);
            }
        }
    });

    return newNoteGraphicsMap;
}

function createSingleNoteGraphics(
    noteData: ChartHitObject,
    laneWidth: number
): { headGraphics: Graphics, bodyGraphics?: Graphics, tailGraphics?: Graphics } { // Updated return type
    console.log(`[createSingleNoteGraphics] ID: ${noteData.id}, Type: ${noteData.note_type}, Time: ${noteData.time}, Duration: ${noteData.duration}`);
    const headGraphics = new Graphics();
    const noteVisualWidth = laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
    const noteRadius = noteVisualWidth / 2;

    const headColor = noteData.note_type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP;
    headGraphics.circle(0, 0, noteRadius).fill({ color: headColor, alpha: AlphaValues.NOTE_IDLE });

    let bodyGraphics: Graphics | undefined;
    let tailGraphics: Graphics | undefined; // Added tail

    if (noteData.note_type === 'hold' && (noteData.duration ?? 0) > 0) {
        console.log(`[createSingleNoteGraphics] ID: ${noteData.id} - Creating body and tail.`);
        bodyGraphics = new Graphics();
        // Initial body rect is minimal, repositionNoteGraphics will size it
        const bodyWidth = noteVisualWidth * 0.5; // Make body thinner than head/tail
        bodyGraphics.rect(-bodyWidth / 2, 0, bodyWidth, 1) // Height 1, y 0 initially
            .fill({ color: Colors.NOTE_HOLD_BODY, alpha: AlphaValues.NOTE_IDLE * 0.7 });

        tailGraphics = new Graphics();
        // Tail looks same as head for now, can be changed
        tailGraphics.circle(0, 0, noteRadius).fill({ color: Colors.NOTE_HOLD_HEAD, alpha: AlphaValues.NOTE_IDLE });
    }

    return { headGraphics, bodyGraphics, tailGraphics };
}

function repositionNoteGraphics(
    graphicsEntry: NoteGraphicsEntry,
    noteDataOriginal: ChartHitObject & { isActivelyHeld?: boolean },
    highwayX: number,
    laneWidth: number,
    songTimeMs: number,
    hitZoneY: number,
    scrollSpeed: number,
    canvasHeight: number
) {
    const { headGraphics, bodyGraphics, tailGraphics, time, duration, note_type, lane, id: noteId } = graphicsEntry;
    const currentDuration = duration ?? 0; // Use duration from graphicsEntry (already processed from noteData)
    const laneCenterX = highwayX + (lane * laneWidth) + (laneWidth / 2);

    // Position Head
    let idealHeadY = getNoteYPosition(time, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);
    headGraphics.x = laneCenterX;
    // Sticky head logic for actively held hold notes
    let stickyHead = false;
    if (note_type === 'hold' && noteDataOriginal.isActivelyHeld) {
        idealHeadY = hitZoneY;
        stickyHead = true;
    }
    headGraphics.y = idealHeadY;

    if (note_type === 'hold' && currentDuration > 0) { // Check for hold note with duration
        const noteEndTime = time + currentDuration;
        const idealTailY = getNoteYPosition(noteEndTime, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);


        console.log(
            `[repositionNoteGraphics] ID: ${noteId}, Time: ${time}, Duration: ${currentDuration}, SongTime: ${songTimeMs.toFixed(0)}\n` +
            `  HeadY: ${idealHeadY.toFixed(2)}, TailY: ${idealTailY.toFixed(2)}\n` +
            `  BodyExists: ${!!bodyGraphics}, TailExists: ${!!tailGraphics}`
        );

        // Position Tail
        if (tailGraphics) {
            tailGraphics.x = laneCenterX;
            tailGraphics.y = idealTailY;
        }

        // Position and draw Body between head and tail
        if (bodyGraphics) { // Explicit check for bodyGraphics to satisfy linter
            bodyGraphics.x = laneCenterX;
            bodyGraphics.y = idealHeadY; // Body anchored at the head's current Y (sticky or not)
            let bodyHeight = idealHeadY - idealTailY;
            if (stickyHead) {
                // If sticky, head is at hitZoneY, tail moves as normal
                bodyHeight = hitZoneY - idealTailY;
            }
            console.log(`[repositionNoteGraphics] ID: ${noteId} - BodyHeight: ${bodyHeight.toFixed(2)}, BodyVisible: ${bodyGraphics.visible}, BodyAlpha: ${bodyGraphics.alpha}`);

            bodyGraphics.clear();
            const noteVisualWidthForBody = laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
            const bodyRectWidth = noteVisualWidthForBody * 0.5; // Thinner body

            if (bodyHeight > 0) {
                bodyGraphics.rect(-bodyRectWidth / 2, -bodyHeight, bodyRectWidth, bodyHeight)
                    .fill({ color: Colors.NOTE_HOLD_BODY, alpha: AlphaValues.NOTE_IDLE * 0.7 });
            } // else: body is already cleared, so it will be empty
        } // End explicit check for bodyGraphics
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
    noteGraphicsMap.forEach((graphicsEntry) => {
        const { headGraphics, bodyGraphics, tailGraphics, lane, note_type, duration, time } = graphicsEntry;
        const currentDuration = duration ?? 0;

        const currentLaneX = highwayX + (lane * laneWidth) + (laneWidth / 2);
        const noteVisualWidth = laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
        const noteRadius = noteVisualWidth / 2;

        // Reposition and redraw head
        headGraphics.x = currentLaneX;
        const idealHeadY = getNoteYPosition(time, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);
        headGraphics.y = idealHeadY;
        headGraphics.clear();
        const headColor = note_type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP;
        headGraphics.circle(0, 0, noteRadius).fill({ color: headColor, alpha: AlphaValues.NOTE_IDLE });

        if (note_type === 'hold' && currentDuration > 0) {
            const noteEndTime = time + currentDuration;
            const idealTailY = getNoteYPosition(noteEndTime, songTimeMs, hitZoneY, scrollSpeed, canvasHeight);

            // Reposition and redraw tail
            if (tailGraphics) {
                tailGraphics.x = currentLaneX;
                tailGraphics.y = idealTailY;
                tailGraphics.clear();
                // Assuming tail looks like head
                tailGraphics.circle(0, 0, noteRadius).fill({ color: Colors.NOTE_HOLD_HEAD, alpha: AlphaValues.NOTE_IDLE });
            }

            // Reposition and redraw body
            if (bodyGraphics) {
                bodyGraphics.x = currentLaneX;
                bodyGraphics.y = idealHeadY;
                const bodyHeight = idealHeadY - idealTailY;
                bodyGraphics.clear();
                const bodyRectWidth = noteVisualWidth * 0.5;
                if (bodyHeight > 0) {
                    bodyGraphics.rect(-bodyRectWidth / 2, -bodyHeight, bodyRectWidth, bodyHeight)
                        .fill({ color: Colors.NOTE_HOLD_BODY, alpha: AlphaValues.NOTE_IDLE * 0.7 });
                }
            }
        }
    });
}

// getNoteGraphics and createNoteGraphicsPool might need minor updates if used directly
// for previews or other non-gameplay scenarios, to include tailGraphics.
// For now, focusing on the main gameplay loop.

export function getNoteGraphics(initialProps: {
    hitObject: ChartHitObject;
    laneWidth: number;
    // noteHeight and holdBodyHeight are less relevant with dynamic sizing
}): NoteGraphicsEntry {
    const { headGraphics, bodyGraphics, tailGraphics } = createSingleNoteGraphics(initialProps.hitObject, initialProps.laneWidth);
    const noteId = initialProps.hitObject.id;

    return {
        id: noteId,
        headGraphics,
        bodyGraphics,
        tailGraphics,
        lane: initialProps.hitObject.lane,
        time: initialProps.hitObject.time,
        duration: initialProps.hitObject.duration ?? 0,
        note_type: initialProps.hitObject.note_type,
        isHit: false
    };
}

// createNoteGraphicsPool is mainly for optimization, can be updated later if this pattern is kept.
// For now, focusing on direct creation in updateNotes.
// ... (createNoteGraphicsPool can be left as is or updated similarly to getNoteGraphics)

