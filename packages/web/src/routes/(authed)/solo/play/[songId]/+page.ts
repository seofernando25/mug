import { orpcClient } from '$lib/rpc-client';
import { error } from '@sveltejs/kit';

export const ssr = false;

export const load = async ({ params, fetch, url }) => {
	const songId = params.songId;
	if (!songId) {
		throw error(404, { message: 'Song ID not provided' });
	}

	let songData: Awaited<ReturnType<typeof orpcClient.song.get>>;
	try {
		songData = await orpcClient.song.get({ id: songId });
	} catch (e: any) {
		console.error(`Error loading song ${songId} via ORPC:`, e);
		throw error(500, { message: `Could not load song data for ${songId}` });
	}

	if (!songData) {
		throw error(404, { message: "Song not found" });
	}

	// difficulty from "?difficulty=str"
	const difficulty = url.searchParams.get('difficulty');

	if (!difficulty) {
		throw error(404, { message: "Difficulty not provided" });
	}

	const chartData = songData.charts.find(c => c.difficultyName === difficulty);
	if (!chartData) {
		throw error(404, { message: "Selected difficulty chart not found" });
	}

	return {
		songId,
		songData,
		chartData,
	};

}