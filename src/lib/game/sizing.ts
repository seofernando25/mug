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

// Default or example values. In a real app, these might be configurable or adaptive.
const DEFAULT_CANVAS_WIDTH = 800;
const DEFAULT_CANVAS_HEIGHT = 600;
const DEFAULT_LANE_WIDTH = 80;
const DEFAULT_RECEPTOR_AREA_HEIGHT = 100; // Height of the area where receptors are placed from bottom
const DEFAULT_NOTE_HEIGHT = 20;

export class GameplaySizing {
    // Get overall gameplay canvas dimensions
    public static getGameplaySizing(): GameplaySizingMetrics {
        // For now, returns fixed size. Could adapt to window size or parent container.
        // This might also read from user preferences if canvas size is configurable.
        return {
            width: DEFAULT_CANVAS_WIDTH,
            height: DEFAULT_CANVAS_HEIGHT
        };
    }

    // Get metrics for the note highway
    public static getHighwayMetrics(numLanes: number): HighwayMetrics {
        const canvasSize = this.getGameplaySizing();
        const totalHighwayWidth = numLanes * DEFAULT_LANE_WIDTH;
        return {
            x: (canvasSize.width - totalHighwayWidth) / 2, // Centered highway
            y: 0,
            width: totalHighwayWidth,
            height: canvasSize.height,
            numLanes: numLanes,
            laneWidth: DEFAULT_LANE_WIDTH,
            receptorYPosition: canvasSize.height - DEFAULT_RECEPTOR_AREA_HEIGHT, // Receptors near the bottom
            judgmentLineYPosition: canvasSize.height - DEFAULT_RECEPTOR_AREA_HEIGHT - 30 // Judgment text above receptors
        };
    }

    // Get positions for each receptor
    public static getReceptorPositions(highwayMetrics: HighwayMetrics): { x: number; y: number }[] {
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
    public static getNoteSize(): NoteSize {
        return {
            width: DEFAULT_LANE_WIDTH * 0.9, // Slightly narrower than lane
            height: DEFAULT_NOTE_HEIGHT
        };
    }

    // Get standard size for receptors
    public static getReceptorSize(): ReceptorSize {
        return {
            width: DEFAULT_LANE_WIDTH, // Receptor can be full lane width
            height: DEFAULT_NOTE_HEIGHT * 1.5 // Receptors can be a bit taller than notes
        };
    }

    // Calculate Y position of a note on the screen
    public static getNoteYPosition(
        noteTimeMs: number,
        currentTimeMs: number,
        receptorYPosition: number,
        speedMultiplier: number, // User's preferred speed setting
        currentBpm: number // Current BPM of the song section
        // Note: A more accurate calculation might involve pixelsPerSecond or similar, derived from BPM and speedMultiplier.
        // This is a simplified version.
    ): number {
        const pixelsPerSecondBase = 300; // Base scroll speed in pixels per second at 1x multiplier and a reference BPM (e.g., 120 BPM)
        const timeDifferenceSeconds = (noteTimeMs - currentTimeMs) / 1000;

        // Adjust speed based on multiplier. BPM adjustment can be more complex if scroll is BPM-dependent.
        // For a simple approach where speedMultiplier is dominant:
        const effectiveScrollSpeed = pixelsPerSecondBase * speedMultiplier;

        return receptorYPosition - (timeDifferenceSeconds * effectiveScrollSpeed);
    }
} 