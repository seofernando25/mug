import { Graphics, Container } from 'pixi.js';
import { Colors, AlphaValues, GameplaySizing, Timing, DebugColors } from './gameplayConstants';
import type { BeatLineEntry, NoteGraphicsEntry, NoteType, ChartHitObject } from './types';

interface StageDimensions {
    width: number;
    height: number;
}

export function drawHighway(
    highwayGraphics: Graphics,
    stage: StageDimensions,
    lanes: number
) {
    highwayGraphics.clear();
    const highwayWidth = stage.width * GameplaySizing.HIGHWAY_WIDTH_RATIO;
    const laneWidth = highwayWidth / lanes;
    const highwayX = (stage.width - highwayWidth) / 2;

    for (let i = 0; i < lanes; i++) {
        highwayGraphics.rect(highwayX + i * laneWidth, 0, laneWidth, stage.height)
                       .fill({ color: Colors.LANE_BACKGROUNDS[i % Colors.LANE_BACKGROUNDS.length], alpha: AlphaValues.LANE_BACKGROUND });
    }
    return { highwayX, highwayWidth, laneWidth }; // Return calculated values for reuse
}

export function drawHighwayLines(
    lineGraphics: Graphics,
    stage: StageDimensions,
    lanes: number,
    highwayX: number, // Pass from drawHighway
    laneWidth: number    // Pass from drawHighway
) {
    lineGraphics.clear();
    for (let i = 0; i < lanes + 1; i++) {
        const xPos = highwayX + i * laneWidth;
        lineGraphics.rect(xPos - GameplaySizing.HIGHWAY_LINE_THICKNESS / 2, 0, GameplaySizing.HIGHWAY_LINE_THICKNESS, stage.height)
                    .fill({ color: Colors.HIGHWAY_LINE });
    }
}

export function drawHitZone(
    hitZoneGraphics: Graphics,
    stage: StageDimensions,
    highwayX: number,    
    lanes: number,
    laneWidth: number
) {
    hitZoneGraphics.clear();
    const hitZoneYCenter = stage.height * GameplaySizing.HIT_ZONE_Y_RATIO;
    
    // Calculate radius for hit zone circles, consistent with new scaled note size
    const hitCircleVisualWidth = laneWidth * (GameplaySizing.NOTE_WIDTH_RATIO * 0.5); 
    const hitCircleRadius = hitCircleVisualWidth / 2;
    for (let i = 0; i < lanes; i++) {
        const laneCenterX = highwayX + (i * laneWidth) + (laneWidth / 2);
        hitZoneGraphics.circle(laneCenterX, hitZoneYCenter, hitCircleRadius)
                       .fill({ color: Colors.HIT_ZONE_CENTER, alpha: AlphaValues.HIT_ZONE_CENTER });
        // Consider adding a stroke for better visibility if needed:
        // .stroke({ width: 1, color: Colors.HIT_ZONE_EDGES, alpha: AlphaValues.HIT_ZONE_EDGES })
    }
    
    return { hitZoneY: hitZoneYCenter }; // Return the center Y for note/beat alignment
}

export function redrawBeatLineGraphicsOnResize(
    beatLines: BeatLineEntry[], // Assuming BeatLineEntry is imported or defined if this file has its own types
    highwayX: number,
    highwayWidth: number
) {
    beatLines.forEach(lineData => {
        lineData.graphics.clear();
        lineData.graphics.rect(
            highwayX,
            -GameplaySizing.BEAT_LINE_HEIGHT / 2, // Y is relative to the graphics object, center it
            highwayWidth,
            GameplaySizing.BEAT_LINE_HEIGHT
        ).fill({ color: Colors.BEAT_LINE, alpha: AlphaValues.BEAT_LINE });
        // Y position of lineData.graphics is managed by the game loop based on beatTime
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
    playheadY: number, // Y-coordinate where beats align with current song time
    existingBeatLines: BeatLineEntry[],
    pixiStage: Container // For adding/removing children
): BeatLineEntry[] {
    const beatIntervalSeconds = (60 / bpm);
    let newBeatLinesArray = [...existingBeatLines]; // Start with existing lines

    // --- Update positions and despawn existing beat lines ---
    const stillVisibleLines: BeatLineEntry[] = [];
    for (const lineData of newBeatLinesArray) {
        // 1. Incremental movement based on capped deltaSeconds
        lineData.graphics.y += scrollSpeed * deltaSeconds;

        // 2. Calculate ideal position based on actual song time
        const timeDifferenceFromPlayhead = lineData.beatTime - currentSongTimeSeconds;
        const idealY = playheadY - (timeDifferenceFromPlayhead * scrollSpeed);

        // 3. Gently interpolate towards the ideal position
        const interpolationFactor = 0.2; // Keep consistent or tune separately
        lineData.graphics.y += (idealY - lineData.graphics.y) * interpolationFactor;

        const isOffScreenBottom = lineData.graphics.y > stage.height + GameplaySizing.BEAT_LINE_HEIGHT * 5;
        const isTooFarInPast = currentSongTimeSeconds - lineData.beatTime > 5.0;

        if (isOffScreenBottom || isTooFarInPast) {
            pixiStage.removeChild(lineData.graphics);
            lineData.graphics.destroy();
        } else {
            stillVisibleLines.push(lineData);
        }
    }
    newBeatLinesArray = stillVisibleLines;

    // --- Spawn new beat lines ---
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
        if (nextBeatCandidateTime >= -0.001) { // Avoid negative beat times unless very close to 0
            const newBeatLineGraphics = new Graphics();
            newBeatLineGraphics.rect(
                highwayX,
                -GameplaySizing.BEAT_LINE_HEIGHT / 2,
                highwayWidth,
                GameplaySizing.BEAT_LINE_HEIGHT
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

interface NoteContext {
    songTimeMs: number;
    scrollSpeed: number;
    stage: StageDimensions;
    lanes: number;
    highwayX: number;
    highwayWidth: number; // Not directly used but often calculated with highwayX
    laneWidth: number;
    hitZoneY: number;
    pixiStage: Container;
    deltaSeconds: number; // Add back for incremental movement
}

// This is a complex function. Breaking it down further might be good for extreme testability,
// but for now, this groups the note rendering cycle.
export function updateNotes(
    ctx: NoteContext,
    sortedHitObjects: Array<ChartHitObject & { id: number }>, 
    currentNoteGraphicsMap: Map<number, NoteGraphicsEntry>
): Map<number, NoteGraphicsEntry> {
    const newNoteGraphicsMap = new Map(currentNoteGraphicsMap);
    const visibleNoteIdsThisFrame = new Set<number>();

    const lookaheadMs = Timing.LOOKAHEAD_SECONDS * 1000;
    const minVisibleTime = ctx.songTimeMs - Timing.NOTE_RENDER_GRACE_PERIOD_MS;
    const maxVisibleTime = ctx.songTimeMs + lookaheadMs;

    sortedHitObjects.forEach(noteData => {
        const noteId = noteData.id;
        const noteStartTime = noteData.time;
        const noteEndTime = noteData.time + (noteData.duration || 0); // Calculate end time, considering duration

        // Revised condition: Note is active if its head is within lookahead AND its tail is not past grace period.
        if (noteStartTime <= maxVisibleTime && noteEndTime >= minVisibleTime) {
            visibleNoteIdsThisFrame.add(noteId);
            let graphicsEntry = newNoteGraphicsMap.get(noteId);

            if (!graphicsEntry) {
                const { headGraphics, bodyGraphics } = createSingleNoteGraphics(noteData, ctx);
                graphicsEntry = {
                    headGraphics,
                    bodyGraphics,
                    lane: noteData.lane,
                    time: noteData.time,
                    duration: noteData.duration,
                    type: noteData.type as NoteType // Assuming noteData.type is compatible
                };
                newNoteGraphicsMap.set(noteId, graphicsEntry);
            } else {
                // For existing notes, just update their Y position.
                // X position and width are handled by redrawNoteGraphicsOnResize for major layout changes.
                // If X needs to be updated every frame for some reason (e.g. dynamic lane width changes independent of resize event),
                // that logic could be added to repositionNoteGraphics or here.
                repositionNoteGraphics(graphicsEntry, noteData, ctx);
                
                // Ensure X position is correctly centered if it needs to be set every frame.
                // Circles are drawn from their center, so headGraphics.x should be the lane center.
                const laneCenterX = ctx.highwayX + (noteData.lane * ctx.laneWidth) + (ctx.laneWidth / 2);
                graphicsEntry.headGraphics.x = laneCenterX;
                if (graphicsEntry.bodyGraphics) {
                    graphicsEntry.bodyGraphics.x = laneCenterX;
                }
            }
        }
    });

    // --- Cull notes no longer visible ---
    let mapChangedDueToCulling = false;
    for (const [noteId, graphicsEntry] of newNoteGraphicsMap) {
        if (!visibleNoteIdsThisFrame.has(noteId)) {
            ctx.pixiStage.removeChild(graphicsEntry.headGraphics);
            graphicsEntry.headGraphics.destroy();
            if (graphicsEntry.bodyGraphics) {
                ctx.pixiStage.removeChild(graphicsEntry.bodyGraphics);
                graphicsEntry.bodyGraphics.destroy();
            }
            newNoteGraphicsMap.delete(noteId);
            mapChangedDueToCulling = true;
        }
    }
    // Return a new map instance if it was modified by culling to ensure reactivity, 
    // or if new notes were added (which already creates a new map via the spread operator earlier).
    // The check `newNoteGraphicsMap.size !== currentNoteGraphicsMap.size` handles additions/deletions.
    return newNoteGraphicsMap;
}

// Helper function to create graphics for a single note
function createSingleNoteGraphics(
    noteData: ChartHitObject & { id: number }, 
    ctx: NoteContext
): { headGraphics: Graphics, bodyGraphics?: Graphics } {
    const headGraphics = new Graphics();
    // Make notes smaller: apply a scaling factor to NOTE_WIDTH_RATIO
    const noteVisualWidth = ctx.laneWidth * (GameplaySizing.NOTE_WIDTH_RATIO * 0.5); 
    const noteRadius = noteVisualWidth / 2;

    // Initial Y position: bottom of the note aligns with hitZoneY when time matches
    const timeDifferenceFromHitZone = (noteData.time - ctx.songTimeMs) / 1000; // in seconds
    // Y position will now be the center of the circle
    const initialY = ctx.hitZoneY - (timeDifferenceFromHitZone * ctx.scrollSpeed);

    const noteColor = noteData.type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP;
    headGraphics.circle(0, 0, noteRadius) // Draw circle at its local 0,0
                .fill({ color: noteColor });

    headGraphics.x = ctx.highwayX + (noteData.lane * ctx.laneWidth) + (ctx.laneWidth / 2); // Center in lane
    headGraphics.y = initialY;



    let bodyGraphics: Graphics | undefined;
    if (noteData.type === 'hold' && noteData.duration && noteData.duration > 0) {
        bodyGraphics = new Graphics();
        // Hold body width should also scale with noteVisualWidth
        const bodyWidth = noteVisualWidth * 0.5; 
        const bodyDurationSeconds = noteData.duration / 1000;
        const bodyHeight = bodyDurationSeconds * ctx.scrollSpeed;

        bodyGraphics.rect(-bodyWidth / 2, -bodyHeight, bodyWidth, bodyHeight) // Draws upwards from y=0
                    .fill({ color: Colors.NOTE_HOLD_BODY, alpha: 0.7 }); // Using 0.7 alpha as no specific const
        
        bodyGraphics.x = headGraphics.x; // Align with head's center x
        bodyGraphics.y = headGraphics.y; // Body's bottom aligns with head's center y

        ctx.pixiStage.addChild(bodyGraphics); 
        ctx.pixiStage.addChild(headGraphics); 
    } else {
        ctx.pixiStage.addChild(headGraphics);
    }

    return { headGraphics, bodyGraphics };
}

// Helper function to update Y positions of existing note graphics
function repositionNoteGraphics(
    graphicsEntry: NoteGraphicsEntry,
    noteData: ChartHitObject, 
    ctx: NoteContext 
) {
    const { headGraphics, bodyGraphics, time, duration, type } = graphicsEntry; // Added type here

    // 1. Incremental movement
    headGraphics.y += ctx.scrollSpeed * ctx.deltaSeconds;
    if (bodyGraphics) {
        bodyGraphics.y = headGraphics.y; // Body moves with the head's Y center
    }

    // 2. Calculate ideal Y position for the head's center
    const timeDifferenceFromHitZone = (time - ctx.songTimeMs) / 1000;
    const idealHeadY = ctx.hitZoneY - (timeDifferenceFromHitZone * ctx.scrollSpeed);

    // 3. Interpolate head towards ideal Y
    const interpolationFactor = 0.2; 
    headGraphics.y += (idealHeadY - headGraphics.y) * interpolationFactor;

    if (bodyGraphics && type === 'hold' && duration && duration > 0) { // Added type check
        bodyGraphics.y = headGraphics.y; // Keep body aligned with head's center

        const bodyDurationSeconds = duration / 1000;
        const newBodyHeight = bodyDurationSeconds * ctx.scrollSpeed;
        
        bodyGraphics.clear();
        // Recalculate visual width using the scaling factor for consistency
        const noteVisualWidth = ctx.laneWidth * (GameplaySizing.NOTE_WIDTH_RATIO * 0.5); 
        const bodyWidth = noteVisualWidth * 0.5; 
        bodyGraphics.rect(-bodyWidth / 2, -newBodyHeight, bodyWidth, newBodyHeight) 
                    .fill({ color: Colors.NOTE_HOLD_BODY, alpha: 0.7 }); // Using 0.7 alpha
    }
}

export function redrawNoteGraphicsOnResize(
    noteGraphicsMap: Map<number, NoteGraphicsEntry>,
    highwayX: number,
    laneWidth: number,
    hitZoneY: number, 
    scrollSpeed: number 
) {
    noteGraphicsMap.forEach((entry, noteId) => {
        const { headGraphics, bodyGraphics, lane, type, duration, time } = entry;

        headGraphics.clear();
        // Apply scaling factor for smaller notes on resize
        const noteVisualWidth = laneWidth * (GameplaySizing.NOTE_WIDTH_RATIO * 0.5);
        const noteRadius = noteVisualWidth / 2;
        
        const noteColor = type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP;
        headGraphics.circle(0, 0, noteRadius)
                    .fill({ color: noteColor });

        headGraphics.x = highwayX + (lane * laneWidth) + (laneWidth / 2); 

        const debugLineThickness = 1;
        headGraphics.rect(-noteRadius, -debugLineThickness / 2, noteVisualWidth, debugLineThickness)
                    .fill({ color: DebugColors.NOTE_CENTER_LINE });


        if (bodyGraphics && type === 'hold' && duration && duration > 0) {
            bodyGraphics.clear();
            // Apply scaling factor for hold body width on resize
            const bodyWidth = noteVisualWidth * 0.5;
            const bodyDurationSeconds = duration / 1000;
            const bodyHeight = bodyDurationSeconds * scrollSpeed;

            bodyGraphics.rect(-bodyWidth / 2, -bodyHeight, bodyWidth, bodyHeight)
                        .fill({ color: Colors.NOTE_HOLD_BODY, alpha: 0.7 }); // Using 0.7 alpha
            
            bodyGraphics.x = headGraphics.x; 
        }
    });
} 