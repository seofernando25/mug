import { Graphics, Container, Application } from 'pixi.js';
import { Colors, Timing, GameplaySizingConstants } from '$lib/game'; // Adjusted path
import { GameplaySizing as GameplaySizingClass } from '$lib/game'; // Adjusted path
import type { NoteGraphics, NoteContext, StageDimensions } from './types';
import type { ChartHitObject, NoteType } from '$lib/game'; // Adjusted path

export function updateNotes(
    ctx: NoteContext,
    sortedHitObjects: Array<ChartHitObject & { id: number }>,
    currentNoteGraphicsMap: Map<number, NoteGraphics>,
    judgedNoteIds: ReadonlySet<number>
): Map<number, NoteGraphics> {
    const newNoteGraphicsMap = new Map(currentNoteGraphicsMap);

    const lookaheadMs = Timing.LOOKAHEAD_SECONDS * 1000;
    const minVisibleTime = ctx.songTimeMs - Timing.NOTE_RENDER_GRACE_PERIOD_MS;
    const maxVisibleTime = ctx.songTimeMs + lookaheadMs;

    sortedHitObjects.forEach(noteData => {
        const noteId = noteData.id;
        let graphicsEntry = newNoteGraphicsMap.get(noteId);

        if (judgedNoteIds.has(noteId)) {
            if (graphicsEntry) {
                ctx.pixiStage.removeChild(graphicsEntry.headGraphics);
                graphicsEntry.headGraphics.destroy();
                if (graphicsEntry.bodyGraphics) {
                    ctx.pixiStage.removeChild(graphicsEntry.bodyGraphics);
                    graphicsEntry.bodyGraphics.destroy();
                }
                newNoteGraphicsMap.delete(noteId);
            }
            return;
        }

        const noteStartTime = noteData.time;
        const noteEndTime = noteData.time + (noteData.duration || 0);

        if (noteStartTime <= maxVisibleTime && noteEndTime >= minVisibleTime) {
            if (!graphicsEntry) {
                const { headGraphics, bodyGraphics } = createSingleNoteGraphics(noteData, ctx);
                graphicsEntry = {
                    id: noteData.id,
                    headGraphics,
                    bodyGraphics,
                    lane: noteData.lane,
                    time: noteData.time,
                    duration: noteData.duration,
                    type: noteData.type as NoteType,
                    isHit: false
                };
                newNoteGraphicsMap.set(noteId, graphicsEntry);
            } else {
                repositionNoteGraphics(graphicsEntry, noteData, ctx);
                const laneCenterX = ctx.highwayX + (noteData.lane * ctx.laneWidth) + (ctx.laneWidth / 2);
                graphicsEntry.headGraphics.x = laneCenterX;
                if (graphicsEntry.bodyGraphics) {
                    graphicsEntry.bodyGraphics.x = laneCenterX;
                }
            }
        } else {
            if (graphicsEntry) {
                ctx.pixiStage.removeChild(graphicsEntry.headGraphics);
                graphicsEntry.headGraphics.destroy();
                if (graphicsEntry.bodyGraphics) {
                    ctx.pixiStage.removeChild(graphicsEntry.bodyGraphics);
                    graphicsEntry.bodyGraphics.destroy();
                }
                newNoteGraphicsMap.delete(noteId);
            }
        }
    });

    return newNoteGraphicsMap;
}

function createSingleNoteGraphics(
    noteData: ChartHitObject & { id: number },
    ctx: NoteContext
): { headGraphics: Graphics, bodyGraphics?: Graphics } {
    const headGraphics = new Graphics();
    const noteVisualWidth = ctx.laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
    const noteRadius = noteVisualWidth / 2;

    const timeDifferenceFromHitZone = (noteData.time - ctx.songTimeMs) / 1000;
    const initialY = ctx.hitZoneY - (timeDifferenceFromHitZone * ctx.scrollSpeed);

    const noteColor = noteData.type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP;
    headGraphics.circle(0, 0, noteRadius)
        .fill({ color: noteColor });

    headGraphics.x = ctx.highwayX + (noteData.lane * ctx.laneWidth) + (ctx.laneWidth / 2);
    headGraphics.y = initialY;

    let bodyGraphics: Graphics | undefined;
    if (noteData.type === 'hold' && noteData.duration && noteData.duration > 0) {
        bodyGraphics = new Graphics();
        const bodyWidth = noteVisualWidth * 0.5;
        const bodyDurationSeconds = noteData.duration / 1000;
        const bodyHeight = bodyDurationSeconds * ctx.scrollSpeed;

        bodyGraphics.rect(-bodyWidth / 2, -bodyHeight, bodyWidth, bodyHeight)
            .fill({ color: Colors.NOTE_HOLD_BODY, alpha: 0.7 });

        bodyGraphics.x = headGraphics.x;
        bodyGraphics.y = headGraphics.y;

        ctx.pixiStage.addChild(bodyGraphics);
        ctx.pixiStage.addChild(headGraphics);
    } else {
        ctx.pixiStage.addChild(headGraphics);
    }

    return { headGraphics, bodyGraphics };
}

function repositionNoteGraphics(
    graphicsEntry: NoteGraphics,
    noteData: ChartHitObject, // Though noteData is ChartHitObject, we use time, duration, type from graphicsEntry
    ctx: NoteContext
) {
    const { headGraphics, bodyGraphics, time, duration, type } = graphicsEntry;

    // Simple Y translation based on deltaSeconds (less prone to sudden jumps if ctx.songTimeMs has a hiccup)
    headGraphics.y += ctx.scrollSpeed * ctx.deltaSeconds;
    if (bodyGraphics) {
        bodyGraphics.y = headGraphics.y; // Keep body attached to head initially
    }

    // Ideal Y position calculation (for interpolation/correction)
    const timeDifferenceFromHitZone = (time - ctx.songTimeMs) / 1000;
    const idealHeadY = ctx.hitZoneY - (timeDifferenceFromHitZone * ctx.scrollSpeed);

    // Interpolate towards the ideal Y position
    const interpolationFactor = 0.2; // Adjust for smoother or snappier movement
    headGraphics.y += (idealHeadY - headGraphics.y) * interpolationFactor;

    if (bodyGraphics && type === 'hold' && duration && duration > 0) {
        bodyGraphics.y = headGraphics.y; // Ensure body Y matches head Y after interpolation

        // Recalculate body height based on current scroll speed
        const bodyDurationSeconds = duration / 1000;
        const newBodyHeight = bodyDurationSeconds * ctx.scrollSpeed;

        // Redraw the body with the new height
        bodyGraphics.clear();
        const noteVisualWidth = ctx.laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
        const bodyWidth = noteVisualWidth * 0.5; // Assuming body width is half of visual note width
        bodyGraphics.rect(-bodyWidth / 2, -newBodyHeight, bodyWidth, newBodyHeight)
            .fill({ color: Colors.NOTE_HOLD_BODY, alpha: 0.7 });
    }
}

export function redrawNoteGraphicsOnResize(
    noteGraphicsMap: Map<number, NoteGraphics>,
    highwayX: number,
    laneWidth: number,
    hitZoneY: number, // Added hitZoneY as it might be needed for y-positioning if scrollSpeed is 0
    scrollSpeed: number
) {
    noteGraphicsMap.forEach((noteGfx) => {
        const currentType: NoteType = noteGfx.type;
        const headGraphics = noteGfx.headGraphics;
        const bodyGraphics = noteGfx.bodyGraphics;
        const lane = noteGfx.lane;
        // const time = noteGfx.time; // Time might be needed if y is recalculated from scratch
        const duration = noteGfx.duration;

        const currentLaneX = highwayX + (lane * laneWidth) + (laneWidth / 2);
        headGraphics.x = currentLaneX;
        // headGraphics.y = ... recalculate based on time, songTime (if available), hitZoneY, scrollSpeed

        const noteVisualWidth = laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
        const noteRadius = noteVisualWidth / 2;
        headGraphics.clear();

        // This comparison was causing issues. Ensure `currentType` which is `NoteType` from `../types.ts`
        // which is 'tap' | 'hold' is correctly compared.
        if (currentType === 'tap') { // TS Error was here
            headGraphics.circle(0, 0, noteRadius).fill(Colors.NOTE_TAP);
        } else if (currentType === 'hold') { // And here
            headGraphics.circle(0, 0, noteRadius).fill(Colors.NOTE_HOLD_HEAD);
        }

        if (bodyGraphics && duration && currentType === 'hold') { // And here for bodyGraphics
            bodyGraphics.x = currentLaneX;
            // bodyGraphics.y = headGraphics.y; // Ensure Y matches
            const bodyWidth = noteVisualWidth * 0.5;
            const bodyHeight = (duration / 1000) * scrollSpeed; // Recalculate height based on new scrollSpeed
            // The original calculation: duration * scrollSpeed * 0.1 seemed off, assuming duration is in ms and scrollSpeed is pixels/sec.
            // Corrected to (duration / 1000) * scrollSpeed for pixels.
            bodyGraphics.clear();
            bodyGraphics.rect(-bodyWidth / 2, -bodyHeight, bodyWidth, bodyHeight).fill(Colors.NOTE_HOLD_BODY); // body is drawn upwards from y
        }
    });
}

export function drawNotes(
    app: Application,
    parentContainer: Container,
    visibleNotes: ChartHitObject[],
    currentTimeMs: number,
    highwayMetrics: ReturnType<typeof GameplaySizingClass.getHighwayMetrics>,
    speedMultiplier: number, // Assuming this is the scroll speed multiplier
    currentBpm: number, // Needed for getNoteYPosition if it uses BPM based scroll
    existingNoteGraphics: NoteGraphics[] // For recycling
): NoteGraphics[] {
    const returnedGraphics: NoteGraphics[] = [];
    let recycledIndex = 0;

    // Calculate scrollSpeed in pixels per millisecond or per second depending on getNoteYPosition
    // This is a simplified scroll speed; actual might be more complex with BPM changes.
    const scrollSpeed = GameplaySizingClass.getNoteYPosition(1000, 0, 0, speedMultiplier, currentBpm) - GameplaySizingClass.getNoteYPosition(0, 0, 0, speedMultiplier, currentBpm);

    visibleNotes.forEach((noteData, index) => {
        let entry: NoteGraphics;
        if (recycledIndex < existingNoteGraphics.length) {
            entry = existingNoteGraphics[recycledIndex++];
            // Reset existing graphics
            entry.headGraphics.clear();
            if (entry.bodyGraphics) {
                entry.bodyGraphics.clear();
                entry.bodyGraphics.visible = true;
            }
            entry.headGraphics.visible = true;
            // Update properties (important if recycling)
            entry.lane = noteData.lane;
            entry.time = noteData.time;
            entry.duration = noteData.duration;
            entry.type = noteData.type as NoteType;
            entry.isHit = false; // Reset hit state

        } else {
            const head = new Graphics();
            parentContainer.addChild(head); // Add to parent only when new
            entry = {
                id: noteData.lane + noteData.time, // Consider a more robust ID, like from ChartHitObject if it has one
                headGraphics: head,
                bodyGraphics: undefined, // Initialize body as undefined
                lane: noteData.lane,
                time: noteData.time,
                duration: noteData.duration,
                type: noteData.type as NoteType,
                isHit: false,
            };
        }

        const laneCenterX = highwayMetrics.x + (noteData.lane * highwayMetrics.laneWidth) + (highwayMetrics.laneWidth / 2);
        entry.headGraphics.x = laneCenterX;
        entry.headGraphics.y = GameplaySizingClass.getNoteYPosition(noteData.time, currentTimeMs, highwayMetrics.receptorYPosition, speedMultiplier, currentBpm);

        const noteVisualWidth = highwayMetrics.laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
        const noteRadius = noteVisualWidth / 2;

        if (entry.type === 'tap') {
            entry.headGraphics.circle(0, 0, noteRadius).fill(Colors.NOTE_TAP);
            if (entry.bodyGraphics) {
                entry.bodyGraphics.visible = false; // Hide body for tap notes
            }
        } else if (entry.type === 'hold') {
            entry.headGraphics.circle(0, 0, noteRadius).fill(Colors.NOTE_HOLD_HEAD);
            if (noteData.duration && noteData.duration > 0) {
                if (!entry.bodyGraphics) {
                    entry.bodyGraphics = new Graphics();
                    parentContainer.addChild(entry.bodyGraphics); // Add to parent only when new
                }
                entry.bodyGraphics.clear(); // Ensure cleared before drawing
                entry.bodyGraphics.visible = true;
                entry.bodyGraphics.x = laneCenterX;
                // Body height calculation based on duration and scroll speed
                const bodyHeight = (noteData.duration / 1000) * Math.abs(scrollSpeed); // Ensure scrollSpeed is positive for height
                const bodyY = entry.headGraphics.y; // Body should start from the head's y
                entry.bodyGraphics.y = bodyY;
                // Draw upwards from the head's Y position
                entry.bodyGraphics.rect(-noteVisualWidth * 0.25, 0, noteVisualWidth * 0.5, -bodyHeight).fill(Colors.NOTE_HOLD_BODY);
            } else {
                if (entry.bodyGraphics) {
                    entry.bodyGraphics.visible = false; // Hide body if duration is zero or undefined
                }
            }
        } else { // Should not happen with NoteType as 'tap' | 'hold'
            if (entry.bodyGraphics) {
                entry.bodyGraphics.visible = false;
            }
        }
        returnedGraphics.push(entry);
    });

    // Hide unused recycled graphics
    for (let i = recycledIndex; i < existingNoteGraphics.length; i++) {
        existingNoteGraphics[i].headGraphics.visible = false;
        if (existingNoteGraphics[i].bodyGraphics) {
            existingNoteGraphics[i].bodyGraphics!.visible = false; // Use non-null assertion if confident it exists or was checked
        }
    }
    return returnedGraphics;
} 