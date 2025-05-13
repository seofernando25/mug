import { Graphics, Container } from 'pixi.js';
import { Colors, AlphaValues, GameplaySizing, Timing } from './gameplayConstants';
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
    highwayX: number,    // Pass from drawHighway
    highwayWidth: number // Pass from drawHighway
) {
    hitZoneGraphics.clear();
    const hitZoneY = stage.height * GameplaySizing.HIT_ZONE_Y_RATIO;

    hitZoneGraphics.rect(highwayX, hitZoneY - GameplaySizing.HIT_ZONE_HEIGHT / 2, highwayWidth, GameplaySizing.HIT_ZONE_HEIGHT)
                   .fill({ color: Colors.HIT_ZONE, alpha: AlphaValues.HIT_ZONE });
    return { hitZoneY }; // Return calculated value for reuse
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
        const noteTime = noteData.time;
        const noteId = noteData.id;

        if (noteTime >= minVisibleTime && noteTime <= maxVisibleTime) {
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
                
                // If X needs to be set every frame (e.g., if it wasn't set correctly on creation or if lanes can shift):
                const noteVisualWidth = ctx.laneWidth * GameplaySizing.NOTE_WIDTH_RATIO;
                const noteX = ctx.highwayX + (noteData.lane * ctx.laneWidth) + (ctx.laneWidth - noteVisualWidth) / 2;
                graphicsEntry.headGraphics.x = noteX;
                if (graphicsEntry.bodyGraphics) {
                    graphicsEntry.bodyGraphics.x = noteX;
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
    noteData: ChartHitObject & { id: number }, // Use the more specific type
    ctx: NoteContext
): { headGraphics: Graphics, bodyGraphics?: Graphics } {
    const noteVisualWidth = ctx.laneWidth * GameplaySizing.NOTE_WIDTH_RATIO;
    const noteX = ctx.highwayX + (noteData.lane * ctx.laneWidth) + (ctx.laneWidth - noteVisualWidth) / 2;
    const initialY = ctx.hitZoneY - ((noteData.time - ctx.songTimeMs) / 1000 * ctx.scrollSpeed);

    const headGraphics = new Graphics();
    headGraphics.rect(0, 0, noteVisualWidth, GameplaySizing.NOTE_HEIGHT)
               .fill({ color: noteData.type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP });
    headGraphics.x = noteX;
    headGraphics.y = initialY;
    ctx.pixiStage.addChild(headGraphics);

    let bodyGraphics: Graphics | undefined = undefined;
    if (noteData.type === 'hold' && noteData.duration && noteData.duration > 0) {
        const bodyHeight = (noteData.duration / 1000) * ctx.scrollSpeed;
        bodyGraphics = new Graphics();
        bodyGraphics.rect(0, 0, noteVisualWidth, bodyHeight)
                     .fill({ color: Colors.NOTE_HOLD_BODY });
        bodyGraphics.x = noteX;
        bodyGraphics.y = initialY + GameplaySizing.NOTE_HEIGHT;
        ctx.pixiStage.addChild(bodyGraphics);
    }

    return { headGraphics, bodyGraphics };
}

// Helper function to update Y positions of existing note graphics
function repositionNoteGraphics(
    graphicsEntry: NoteGraphicsEntry,
    noteData: ChartHitObject, // Contains noteData.time for idealY calculation
    ctx: NoteContext // Contains songTimeMs (true time) and deltaSeconds (capped for incremental move)
) {
    const interpolationFactor = 0.2; // Adjust for smoothness/speed of correction (0.1 to 0.3 is common)

    // 1. Smooth incremental movement for head based on capped deltaSeconds
    graphicsEntry.headGraphics.y += ctx.scrollSpeed * ctx.deltaSeconds;

    // 2. Calculate ideal head position based on actual song time
    const idealHeadY = ctx.hitZoneY - ((noteData.time - ctx.songTimeMs) / 1000 * ctx.scrollSpeed);

    // 3. Gently interpolate head towards its ideal position
    graphicsEntry.headGraphics.y += (idealHeadY - graphicsEntry.headGraphics.y) * interpolationFactor;

    if (graphicsEntry.bodyGraphics) {
        // 1. Smooth incremental movement for body
        graphicsEntry.bodyGraphics.y += ctx.scrollSpeed * ctx.deltaSeconds;

        // 2. Calculate ideal body position (relative to ideal head position)
        const idealBodyY = idealHeadY + GameplaySizing.NOTE_HEIGHT;

        // 3. Gently interpolate body towards its ideal position
        graphicsEntry.bodyGraphics.y += (idealBodyY - graphicsEntry.bodyGraphics.y) * interpolationFactor;
    }
}

export function redrawNoteGraphicsOnResize(
    noteGraphicsMap: Map<number, NoteGraphicsEntry>,
    highwayX: number,
    laneWidth: number,
    scrollSpeed: number // Needed for bodyHeight if recalculating
) {
    noteGraphicsMap.forEach(graphicsEntry => {
        const noteVisualWidth = laneWidth * GameplaySizing.NOTE_WIDTH_RATIO;
        const noteX = highwayX + (graphicsEntry.lane * laneWidth) + (laneWidth - noteVisualWidth) / 2;

        // Update head graphics
        graphicsEntry.headGraphics.x = noteX;
        graphicsEntry.headGraphics.clear();
        graphicsEntry.headGraphics.rect(0, 0, noteVisualWidth, GameplaySizing.NOTE_HEIGHT)
            .fill({ color: graphicsEntry.type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP });

        // Update body graphics if it exists
        if (graphicsEntry.bodyGraphics) {
            graphicsEntry.bodyGraphics.x = noteX;
            // Recalculate bodyHeight based on its original duration and current scrollSpeed
            const bodyHeight = graphicsEntry.duration ? (graphicsEntry.duration / 1000) * scrollSpeed : 0;
            graphicsEntry.bodyGraphics.clear();
            graphicsEntry.bodyGraphics.rect(0, 0, noteVisualWidth, bodyHeight)
                .fill({ color: Colors.NOTE_HOLD_BODY });
        }
        // Y positions of notes are managed by the game loop based on songTime
    });
} 