import { error } from '@sveltejs/kit';
import type { Load } from '@sveltejs/kit';
// Import types from the new central location
import type { SongData, SongMetadata, Chart } from '$lib/types/song';

// Disable SSR for this page
export const ssr = false;

// Define the expected shape of the data returned by load
export interface PageSongData {
	songId: string;
	metadata: SongMetadata;
	chart: Chart;
}

// Explicitly type the return value of the async function instead of Load generic
export const load = (async ({ params, fetch }): Promise<PageSongData> => {
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
			chart: songData.charts[0] 
		};
	} catch (e: any) {
		console.error(`Error loading song ${songId}:`, e);
		if (e.status) {
			throw e;
		}
		throw error(500, `Could not load song data for ${songId}`);
	}
}); 