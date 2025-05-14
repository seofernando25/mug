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

// Placeholder for timing change events in a chart
export interface CanviVelocitat {
    time: number;       // Time in seconds or beats when this change occurs
    bpm?: number;        // New BPM from this point
    scrollSpeed?: number; // New scroll speed multiplier from this point
    // Add other properties like stops, delays, warps if needed
}

export const esquemaCanvisVelocitat = {}; // Placeholder, actual schema/validation might be complex

// Represents a single musical note or event in a chart
export interface Note {
    id: string | number; // Unique identifier for the note
    time: number;        // Time in milliseconds from the start of the song when the note should be hit
    lane: number;        // The lane or column the note falls into (e.g., 0, 1, 2, 3 for a 4-lane game)
    type: 'tap' | 'hold'; // CORRECTED: Aligning with user data and simpler NoteType
    duration?: number;    // Duration in milliseconds, for hold notes (from start to end)
    isHit?: boolean;      // Flag if the note has been successfully hit
    isMissed?: boolean;   // Flag if the note has been missed
    // Add other properties like keySound, visualStyle, etc.
}

// Represents the musical and timing information for a song
export interface SongData {
    id: string;
    title: string;
    artist: string;
    audioUrl: string;    // Path or URL to the audio file
    coverUrl?: string;   // Path or URL to the song cover image
    durationMs: number;  // Total duration of the song in milliseconds
    previewStartMs?: number; // Time in ms where song preview should start
    // Add other metadata like genre, album, etc.
}

// Represents the gameplay chart for a specific difficulty of a song
export interface ChartData {
    songId: string;      // Foreign key linking to SongData
    difficultyName: string; // e.g., "Easy", "Hard", "Expert"
    difficultyLevel?: number; // Numerical representation of difficulty
    numLanes: number;    // Number of lanes/columns in this chart (e.g., 4, 6, 8)
    notes: Note[];       // Array of all notes in the chart, sorted by time
    timing: {
        bpms: { time: number; bpm: number }[]; // Time in seconds
        stops?: { time: number; duration: number }[]; // Time in seconds, duration in seconds
        delays?: { time: number; duration: number }[]; // Time in seconds, duration in seconds
        scrollSpeeds?: { time: number; multiplier: number }[]; // Time in seconds
        beats?: { time: number; type: 'downbeat' | 'subdivision' }[]; // Beat markers for visual cues, time in ms
    };
    // Add other chart-specific metadata like chart author, description, etc.
} 