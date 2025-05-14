// src/lib/gameplaySizing.ts

// Placeholder for gameplay screen sizing and element positioning logic

export interface GameplaySizingMetrics {
    width: number;          // Total width of the gameplay canvas
    height: number;         // Total height of the gameplay canvas
    // Add other overall metrics if needed
}

export interface HighwayMetrics {
    x: number;              // X-coordinate of the highway's left edge
    y: number;              // Y-coordinate of the highway's top edge (usually 0)
    width: number;          // Width of the entire highway (all lanes)
    height: number;         // Height of the highway (usually same as canvas height)
    numLanes: number;       // Number of lanes
    laneWidth: number;      // Width of a single lane
    receptorYPosition: number; // Y-coordinate where notes should be hit (from top)
    judgmentLineYPosition: number; // Y-coordinate for judgment text (usually near receptors)
    // Add other highway-specific metrics
}

export interface NoteSize {
    width: number;
    height: number;
}

export interface ReceptorSize {
    width: number;
    height: number;
}

// Default or example values. These can serve as fallbacks if no dynamic dimensions are provided.
const DEFAULT_FALLBACK_CANVAS_WIDTH = 800;
const DEFAULT_FALLBACK_CANVAS_HEIGHT = 600;
// Let lane width be a proportion of the highway width, or a fixed minimum.
// For dynamic sizing, fixed DEFAULT_LANE_WIDTH might be too rigid.
// Let's make it a proportion of the available canvas width, divided by lanes, or a sensible minimum/maximum.
// const DEFAULT_LANE_WIDTH = 80; // This will become dynamic or a base for calculation

const DEFAULT_RECEPTOR_AREA_HEIGHT_PROPORTION = 0.15; // e.g., 15% of canvas height from bottom
const DEFAULT_NOTE_HEIGHT_PROPORTION = 0.03; // e.g., 3% of canvas height

export class GameplaySizing {
    // Get overall gameplay canvas dimensions
    public static getGameplaySizing(containerWidth?: number, containerHeight?: number): GameplaySizingMetrics {
        const width = containerWidth ?? DEFAULT_FALLBACK_CANVAS_WIDTH;
        const height = containerHeight ?? DEFAULT_FALLBACK_CANVAS_HEIGHT;
        return {
            width: width,
            height: height
        };
    }

    // Get metrics for the note highway
    public static getHighwayMetrics(numLanes: number, canvasWidth?: number, canvasHeight?: number): HighwayMetrics {
        // Use provided canvas dimensions, or fall back to defaults
        const effectiveCanvasWidth = canvasWidth ?? DEFAULT_FALLBACK_CANVAS_WIDTH;
        const effectiveCanvasHeight = canvasHeight ?? DEFAULT_FALLBACK_CANVAS_HEIGHT;

        // Make lane width responsive, e.g., 1/8th of canvas width for a 4-lane setup,
        // but ensure it's not excessively wide or narrow. Max of 100px, min of 60px for example.
        // Or, a certain percentage of total width dedicated to highway.
        // Let's say highway takes up 50% of canvas width for 4 lanes, 60% for 6 lanes, etc.
        const highwayWidthProportion = numLanes <= 4 ? 0.5 : numLanes <= 6 ? 0.6 : 0.75;
        const totalHighwayWidth = effectiveCanvasWidth * highwayWidthProportion;
        const laneWidth = totalHighwayWidth / numLanes;

        const receptorY = effectiveCanvasHeight * (1 - DEFAULT_RECEPTOR_AREA_HEIGHT_PROPORTION);

        return {
            x: (effectiveCanvasWidth - totalHighwayWidth) / 2, // Centered highway
            y: 0,
            width: totalHighwayWidth,
            height: effectiveCanvasHeight,
            numLanes: numLanes,
            laneWidth: laneWidth,
            receptorYPosition: receptorY,
            judgmentLineYPosition: receptorY - (effectiveCanvasHeight * 0.05) // Judgment text 5% of canvas height above receptors
        };
    }

    // Get positions for each receptor
    public static getReceptorPositions(highwayMetrics: HighwayMetrics, _canvasWidth?: number, _canvasHeight?: number): { x: number; y: number }[] {
        // This function primarily uses highwayMetrics which are already calculated with dynamic dimensions.
        // _canvasWidth and _canvasHeight are accepted for signature consistency but might not be directly used if all info is in highwayMetrics.
        const positions = [];
        for (let i = 0; i < highwayMetrics.numLanes; i++) {
            positions.push({
                x: highwayMetrics.x + i * highwayMetrics.laneWidth + highwayMetrics.laneWidth / 2, // Center of the lane
                y: highwayMetrics.receptorYPosition
            });
        }
        return positions;
    }

    // Get standard size for notes
    public static getNoteSize(canvasWidth?: number, canvasHeight?: number, numLanesIfKnown?: number): NoteSize {
        // Note width could be relative to laneWidth. We need laneWidth here.
        // This implies getNoteSize might need highwayMetrics or numLanes + canvasWidth to recalc laneWidth.
        // For simplicity, let's assume a proportional width to a typical lane.
        // A more robust way: pass highwayMetrics or calculate laneWidth again.
        const _canvasWidth = canvasWidth ?? DEFAULT_FALLBACK_CANVAS_WIDTH;
        const _canvasHeight = canvasHeight ?? DEFAULT_FALLBACK_CANVAS_HEIGHT;

        // Recalculate a typical laneWidth for note sizing if not directly available
        const lanes = numLanesIfKnown ?? 4; // Default to 4 lanes for this calc if not specified
        const highwayWidthProportion = lanes <= 4 ? 0.5 : lanes <= 6 ? 0.6 : 0.75;
        const totalHighwayWidth = _canvasWidth * highwayWidthProportion;
        const typicalLaneWidth = totalHighwayWidth / lanes;

        return {
            width: typicalLaneWidth * 0.9, // Slightly narrower than calculated typical lane
            height: _canvasHeight * DEFAULT_NOTE_HEIGHT_PROPORTION
        };
    }

    // Get standard size for receptors
    public static getReceptorSize(canvasWidth?: number, canvasHeight?: number, numLanesIfKnown?: number): ReceptorSize {
        const _canvasWidth = canvasWidth ?? DEFAULT_FALLBACK_CANVAS_WIDTH;
        const _canvasHeight = canvasHeight ?? DEFAULT_FALLBACK_CANVAS_HEIGHT;

        const lanes = numLanesIfKnown ?? 4;
        const highwayWidthProportion = lanes <= 4 ? 0.5 : lanes <= 6 ? 0.6 : 0.75;
        const totalHighwayWidth = _canvasWidth * highwayWidthProportion;
        const typicalLaneWidth = totalHighwayWidth / lanes;
        const noteHeight = _canvasHeight * DEFAULT_NOTE_HEIGHT_PROPORTION;

        return {
            width: typicalLaneWidth, // Receptor can be full lane width
            height: noteHeight * 1.5 // Receptors can be a bit taller than notes
        };
    }

    // Calculate Y position of a note on the screen
    public static getNoteYPosition(
        noteTimeMs: number,
        currentTimeMs: number,
        receptorYPosition: number,
        speedMultiplier: number, // User's preferred speed setting
        currentBpm: number, // Current BPM of the song section
        // Optional: pass canvasHeight if scroll speed should be relative to it
        _canvasHeight?: number
    ): number {
        // const effectiveCanvasHeight = canvasHeight ?? DEFAULT_FALLBACK_CANVAS_HEIGHT;
        // pixelsPerSecondBase could be a fraction of effectiveCanvasHeight to make scroll speed responsive to screen size.
        // e.g., pixelsPerSecondBase = effectiveCanvasHeight * 0.5; (meaning notes visible for 2 seconds at 1x speed)
        const pixelsPerSecondBase = (_canvasHeight ?? DEFAULT_FALLBACK_CANVAS_HEIGHT) * 0.6; // Travels 60% of screen height per second at 1x
        const timeDifferenceSeconds = (noteTimeMs - currentTimeMs) / 1000;
        const effectiveScrollSpeed = pixelsPerSecondBase * speedMultiplier;
        return receptorYPosition - (timeDifferenceSeconds * effectiveScrollSpeed);
    }
} 