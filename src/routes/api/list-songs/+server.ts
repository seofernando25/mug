import { db } from '$lib/server/db';
import s3 from '$lib/server/s3'; // Corrected: Assuming S3 client is a default export
import { song, chart } from '$lib/server/db/music-schema';
import { eq, sql } from 'drizzle-orm';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SongListItem } from '$lib/client/api'; // For type consistency

// Define a reasonable expiry for image URLs if you decide to presign them here
const IMAGE_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

export const GET: RequestHandler = async () => {
	try {
		const songsData = await db
			.select({
				id: song.id,
				title: song.title,
				artist: song.artist,
				imageS3Key: song.imageS3Key,
				// Aggregate distinct difficulty names into an array for each song
				// This uses PostgreSQL's array_agg function.
				// Order by difficulty name for consistent ordering.
				difficulties: sql<string[]>`array_agg(DISTINCT ${chart.difficultyName} ORDER BY ${chart.difficultyName})`.mapWith(names => names || []),
			})
			.from(song)
			.leftJoin(chart, eq(song.id, chart.songId))
			.groupBy(song.id, song.title, song.artist, song.imageS3Key) // Group by all selected non-aggregated song fields
			.orderBy(song.title) // Optional: order songs by title by default
			.execute();

		const songListItems: SongListItem[] = await Promise.all(
			songsData.map(async (s) => {
				let imageUrl: string | undefined = undefined;
				if (s.imageS3Key) {
					try {
						imageUrl = await s3.file(s.imageS3Key).presign({
							expiresIn: IMAGE_URL_EXPIRY_SECONDS,
						});
					} catch (imgErr) {
						console.warn(`Failed to presign image URL for key ${s.imageS3Key} in list-songs:`, imgErr);
						// Continue without image if presigning fails
					}
				}
				return {
					id: s.id,
					title: s.title,
					artist: s.artist,
					imageUrl: imageUrl,
					difficulties: s.difficulties, // This is already an array of strings
				};
			})
		);

		return json({ songs: songListItems });

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