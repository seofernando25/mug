export interface HitObject {
	time: number;       // Time in milliseconds from the start of the audio
	lane: number;       // Lane index (e.g., 0-3 for 4 lanes)
	type: 'tap' | 'hold'; // Type of note
	duration?: number;  // Duration in milliseconds for hold notes
}

export interface Chart {
	difficultyName: string;
	lanes: number;
	noteScrollSpeed: number;
	lyrics?: { time: number; text: string }[];
	hitObjects: HitObject[];
	mockLeaderboard?: { name: string; score: number }[];
}

export interface SongMetadata {
	title: string;
	artist: string;
	audioFilename: string;
	bpm: number;
	previewStartTime?: number; // Time in milliseconds for audio preview
	offset?: number; // Global timing offset in milliseconds (future use)
}

export interface SongData {
	metadata: SongMetadata;
	charts: Chart[];
} 