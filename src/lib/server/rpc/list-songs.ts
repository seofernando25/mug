import { db } from '$lib/server/db';
import { type } from 'arktype';
import s3Client from '../s3';
import { routerBaseContext } from './context';

// No specific input schema for listing all songs, but can be added for pagination/filtering
export const ListSongsInput = type({
});

export const listSongsProcedure = routerBaseContext
	.input(ListSongsInput)
	// Output will be inferred
	.handler(async ({ input }) => {
		try {
			// Fetch songs with their related charts
			const songsWithCharts = await db.query.song.findMany({
				with: {
					charts: {
						columns: {
							difficultyName: true, // Only fetch the difficultyName from charts
						}
					}
				},
			});

			// Process the data in JavaScript to create the SongListItem array
			const items = songsWithCharts.map(s => {
				const difficultyNames = s.charts.map(c => c.difficultyName);
				// Get unique, sorted difficulty names
				const uniqueDifficulties = [...new Set(difficultyNames)].sort();

				return {
					...s,
					difficulties: uniqueDifficulties,
				};
			});

			// Sign the image urls
			const itemsWithSignedUrls = await Promise.all(items.map(async (item) => {
				if (item.imageS3Key) {
					const signedUrl = s3Client.presign(item.imageS3Key, {
						acl: 'public-read',
					})
					return {
						...item,
						imageUrl: signedUrl,
					}
				} else {
					return {
						...item,
						imageUrl: null,
					}
				}
			}));

			return { items: itemsWithSignedUrls };
		} catch (e: any) {
			console.error('Error listing songs:', e);
			// Throw an actual error for unexpected server issues
			throw new Error(e.message || 'An error occurred while listing songs.');
		}
	}); 