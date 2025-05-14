import { error } from '@sveltejs/kit';
// Import types from the new central location
import type { SongData as PageSongData, Chart as PageChart, HitObject as PageHitObject } from '$lib/types/song';
// Import types expected by the game engine
import type { SongData as GameSongData, ChartData as GameChartData, Note as GameNote } from '$lib/game/types';

// Disable SSR for this page
export const ssr = false;

export const load = (async ({ params, fetch }) => {
	const songIdFromRoute = params.songId;
	if (!songIdFromRoute) {
		throw error(404, 'Song ID not provided');
	}

	const songJsonPath = `/songs/${songIdFromRoute}/song.json`;

	try {
		const response = await fetch(songJsonPath);

		if (!response.ok) {
			throw error(response.status, `Failed to load song data: ${response.statusText}`);
		}

		const pageSongData: PageSongData = await response.json();

		if (!pageSongData || !pageSongData.metadata || !pageSongData.charts || pageSongData.charts.length === 0) {
			throw error(500, 'Invalid song data format');
		}

		// Transform PageSongData to GameSongData
		const gameReadySongData: GameSongData = {
			id: songIdFromRoute, // Use the ID from the route, or pageSongData.metadata.title if preferred
			title: pageSongData.metadata.title,
			artist: pageSongData.metadata.artist,
			audioUrl: `/songs/${songIdFromRoute}/${pageSongData.metadata.audioFilename}`, // Corrected path
			durationMs: 0, // Placeholder; game logic might update this from actual audio duration
			// coverUrl and previewStartMs are optional in GameSongData
		};

		// Assuming we use the first chart
		const pageChart: PageChart = pageSongData.charts[0];

		// Transform PageChart to GameChartData
		const gameReadyChartData: GameChartData = {
			songId: gameReadySongData.id,
			difficultyName: pageChart.difficultyName,
			numLanes: pageChart.lanes,
			noteScrollSpeed: pageChart.noteScrollSpeed,
			notes: pageChart.hitObjects.map((hitObject: PageHitObject, index: number): GameNote => ({
				id: `note-${index}`,
				time: hitObject.time,
				lane: hitObject.lane,
				type: hitObject.type, // 'tap' | 'hold'
				duration: hitObject.duration,
				isHit: false,
				isMissed: false,
			})),
			timing: {
				bpms: pageSongData.metadata.bpm ? [{ time: 0, bpm: pageSongData.metadata.bpm }] : [],
				// Optional timing events (stops, delays, scrollSpeeds, beats) can be empty or undefined
				beats: [], // Defaulting to empty array as per previous logic
			},
		};

		return {
			songId: songIdFromRoute, // Keep original songId if needed elsewhere, though gameReadySongData also has an id
			songData: gameReadySongData, // This is now GameSongData
			chartData: gameReadyChartData, // This is now GameChartData
		};
	} catch (e: any) {
		console.error(`Error loading song ${songIdFromRoute}:`, e);
		if (e.status) {
			throw e;
		}
		throw error(500, `Could not load song data for ${songIdFromRoute}`);
	}
}); 