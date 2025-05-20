// src/routes/solo/play/[songId]/+page.ts
import { error } from '@sveltejs/kit';
// Import types for the data received from your *new API*
import type { ProcessedSongData as ApiSongResponse, ConvertedChartData as ApiChartData, ConvertedHitObject as ApiHitObject } from '$lib/server/conversion'; // Or define these types closer to the API definition
// Import types expected by the game engine
import type { SongData as GameSongData, ChartData as GameChartData, Note as GameNote } from '$lib/game/types';


// Disable SSR for this page
export const ssr = false;

// Define a type for the data you expect from your new /api/song/[songId] endpoint
// This should match the structure created in the server's GET function
interface SongDataFromApi {
	id: string; // Song UUID
	title: string;
	artist: string;
	bpm: number;
	previewStartTime: number; // ms
	audioUrl: string; // S3 presigned URL
	imageUrl: string | null; // S3 presigned URL or null
	uploadDate: string; // Or Date, depending on how Drizzle/JSON handles it

	charts: {
		id: string; // Chart UUID
		difficultyName: string;
		lanes: number;
		noteScrollSpeed: number;
		lyrics: { time: number; text: string; }[] | null; // Assuming lyrics are stored as JSONB
		hitObjects: { // Array of hit objects for THIS chart
			time: number;
			lane: number;
			type: 'tap' | 'hold';
			duration: number | null; // ms, for hold notes
		}[];
	}[];
}


export const load = (async ({ params, fetch }) => {
	const songIdFromRoute = params.songId;
	if (!songIdFromRoute) {
		throw error(404, { message: 'Song ID not provided' });
	}

	// **** CHANGE: Fetch data from the new API endpoint ****
	const apiUrl = `/api/song/${songIdFromRoute}`;

	try {
		const response = await fetch(apiUrl);

		if (!response.ok) {
			// Server should return errors with { message: ... }
			const errorResponse = await response.json().catch(() => ({ message: 'Unknown API error' }));
			throw error(response.status, { message: errorResponse.message || `Failed to load song data: ${response.statusText}` });
		}

		// **** CHANGE: Parse the data expected from the API ****
		const songDataFromApi: SongDataFromApi = await response.json();

		// Basic validation of the API response structure
		if (!songDataFromApi || !songDataFromApi.id || !songDataFromApi.metadata || !songDataFromApi.charts || songDataFromApi.charts.length === 0 || !songDataFromApi.audioUrl) {
			// If the API returns 200 but the data is malformed
			console.error("API returned malformed song data:", songDataFromApi);
			throw error(500, { message: 'Invalid song data format received from server' });
		}

		// Assuming we use the first chart provided by the API for now
		// You might add logic later to select a specific chart by ID or difficulty
		const apiChart = songDataFromApi.charts[0];


		// **** Adapt Transformation Logic to the new API response structure ****

		// Transform API data to GameSongData
		const gameReadySongData: GameSongData = {
			id: songDataFromApi.id, // Use the UUID from the API
			title: songDataFromApi.title,
			artist: songDataFromApi.artist,
			audioUrl: songDataFromApi.audioUrl, // Use the S3 presigned URL directly
			// imageCoverUrl: songDataFromApi.imageUrl ?? undefined, // Use S3 image URL if exists
			previewStartMs: songDataFromApi.previewStartTime,
			durationMs: 0, // Still a placeholder, set by game engine after audio load
		};

		// Transform API Chart Data to GameChartData
		const gameReadyChartData: GameChartData = {
			chartId: apiChart.id, // Use the Chart UUID from the API
			songId: gameReadySongData.id, // Link to the parent song ID
			difficultyName: apiChart.difficultyName,
			numLanes: apiChart.lanes,
			noteScrollSpeed: apiChart.noteScrollSpeed,
			lyrics: apiChart.lyrics ?? undefined, // Use lyrics if provided

			// Map hit objects from the embedded array in the API response chart object
			notes: apiChart.hitObjects.map((hitObject: ApiHitObject, index: number): GameNote => ({
				// Note: Using index as ID for GameNote is okay if only used client-side per chart load
				// A better unique ID might be needed if notes are tracked globally or across loads.
				id: `note-${hitObject.time}-${hitObject.lane}-${index}`, // More unique ID
				time: hitObject.time,
				lane: hitObject.lane,
				type: hitObject.type,
				duration: hitObject.duration ?? undefined, // Use undefined if null
				isHit: false, // Initial state for game
				isMissed: false, // Initial state for game
			})),
			timing: {
				// Your API provides initial BPM. If TimingPoints from osu! were fully
				// parsed and stored in the DB, you'd fetch them here and populate bpms array.
				bpms: songDataFromApi.bpm ? [{ time: 0, bpm: songDataFromApi.bpm }] : [],
				beats: [], // Still need logic to generate beat lines based on BPM/Meter
				// Optional timing events (stops, delays, scrollSpeeds) would also be fetched here
			},
		};

		return {
			// Return data needed by the Svelte page component
			songId: songIdFromRoute, // Original ID from route params
			songData: gameReadySongData, // Game-ready song metadata
			chartData: gameReadyChartData, // Game-ready chart data with notes
		};

	} catch (e: any) {
		console.error(`Error loading song ${songIdFromRoute} via API:`, e);
		// Re-throw HTTP errors, or return a generic 500
		if (e.status) {
			throw e;
		}
		throw error(500, { message: `Could not load song data for ${songIdFromRoute}` });
	}
});