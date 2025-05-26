import type { HitObject } from './NoteTypes';

export interface GameplaySong {
	audioFilename: string;
	backgroundImageUrl?: string;
	noteScrollMultiplier?: number; // defaults to 1.0
	bpm: number;
	lanes: number;
	hitObjects: HitObject[];
} 