import type { Graphics } from 'pixi.js';

export type BeatLineEntry = {
	graphics: Graphics;
	beatTime: number;
};

export type NoteType = 'tap' | 'hold';

export type NoteGraphicsEntry = {
	id: number; // Unique identifier for the note (usually its index in sortedHitObjects)
	headGraphics: Graphics;
	bodyGraphics?: Graphics;
	lane: number;
	time: number; // Time of the note in ms
	duration?: number; // Duration of the note in ms (for holds)
	type: NoteType;
	isHit: boolean; // Has this note been judged (hit or missed)?
}; // Key in the main map is also this id for convenience

// You can expand this with Chart and Metadata types if needed for function signatures
// For now, we'll assume they are passed as part of PageData or destructured in the Svelte component. 

export interface ChartHitObject {
    time: number;
    lane: number;
    type: string; // Can be refined to NoteType if chart data guarantees it
    duration?: number;
    // Add any other properties that come from the chart's hitObjects, e.g.:
    // someOtherProperty?: any;
} 