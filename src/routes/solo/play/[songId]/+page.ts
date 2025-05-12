import { error } from '@sveltejs/kit';
import type { Load } from '@sveltejs/kit';

// Define types for the song data structure (optional but recommended)
interface HitObject {
	time: number;
	lane: number;
	type: 'tap' | 'hold';
	duration?: number; // Only for hold notes
}

interface Chart {
	difficultyName: string;
	lanes: number;
	noteScrollSpeed: number;
	lyrics?: { time: number; text: string }[];
	hitObjects: HitObject[];
	mockLeaderboard?: { name: string; score: number }[];
}

interface SongMetadata {
	title: string;
	artist: string;
	audioFilename: string;
	bpm: number;
	previewStartTime?: number;
}

interface SongData {
	metadata: SongMetadata;
	charts: Chart[];
}

// Disable SSR for this page
export const ssr = false;

export const load: Load = async ({ params, fetch }) => {
	const songId = params.songId;
	if (!songId) {
		throw error(404, 'Song ID not provided');
	}

	const songJsonPath = `/songs/${songId}/song.json`;

	try {
		const response = await fetch(songJsonPath);

		if (!response.ok) {
			throw error(response.status, `Failed to load song data: ${response.statusText}`);
		}

		const songData: SongData = await response.json();

		if (!songData || !songData.metadata || !songData.charts || songData.charts.length === 0) {
			throw error(500, 'Invalid song data format');
		}

		// Return metadata and the first chart
		return {
			songId,
			metadata: songData.metadata,
			chart: songData.charts[0] // Assuming we always use the first chart for MVP
		};
	} catch (e: any) {
		console.error(`Error loading song ${songId}:`, e);
		if (e.status) { // Re-throw SvelteKit errors
			throw e;
		}
		throw error(500, `Could not load song data for ${songId}`);
	}
}; 