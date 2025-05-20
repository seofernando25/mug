import { db } from '$lib/server/db'; // Assuming db instance is exported from here
import { chart, song } from '$lib/server/db/music-schema';
import { eq, sql } from 'drizzle-orm';

export const load = async () => {
	try {
		const songsWithDifficulties = await db
			.select({
				id: song.id,
				title: song.title,
				artist: song.artist,
				// Aggregate difficulty names into an array
				// Using sql`array_agg(DISTINCT ${chart.difficultyName})` for PostgreSQL
				// If using a different DB, this aggregation might need adjustment.
				difficulties: sql<string[]>`array_agg(DISTINCT ${chart.difficultyName} ORDER BY ${chart.difficultyName})`.mapWith(names => names || []),
			})
			.from(song)
			.leftJoin(chart, eq(song.id, chart.songId))
			.groupBy(song.id, song.title, song.artist) // Group by all selected song fields
			.orderBy(song.title) // Optional: order songs by title
			.execute();

		return {
			songs: songsWithDifficulties,
		};
	} catch (e: any) {
		console.error('Error loading songs in +page.server.ts:', e);
		return {
			songs: [],
			error: 'Could not load songs. Please try again later.'
		};
	}
} 