import { db } from '$lib/server/db';
import { chart, song } from '$lib/server/db/music-schema';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const songsFromDb = await db.select({
			id: song.id,
			title: song.title,
			artist: song.artist,
			imageS3Key: song.imageS3Key,
			charts: chart.difficultyName
		})
			.from(song)
			.leftJoin(chart, eq(song.id, chart.songId))
			.execute();

		// Aggregate difficulties and prepare SongListItem
		const songsMap = new Map<string, { id: string; title: string; artist: string; imageS3Key: string | null; difficulties: string[] }>();

		for (const row of songsFromDb) {
			if (!row.id || !row.title || !row.artist) continue; // Skip if essential data missing

			let existing = songsMap.get(row.id);
			if (!existing) {
				existing = {
					id: row.id,
					title: row.title,
					artist: row.artist,
					imageS3Key: row.imageS3Key,
					difficulties: []
				};
				songsMap.set(row.id, existing);
			}
			if (row.charts) {
				existing.difficulties.push(row.charts);
			}
		}

		return json({ items: songsMap });

	} catch (e: any) {
		console.error('Error fetching song list:', e);
		// If it's already an HTTP error, rethrow it (though unlikely here without specific error(status, message) calls)
		if (e.status) {
			throw e;
		}
		// Otherwise, return a generic 500 error
		throw error(500, { message: 'Internal server error fetching song list.' });
	}
}; 