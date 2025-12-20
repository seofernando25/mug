import { db, song, s3 } from '@mug/db';
import { type } from 'arktype';
import { eq } from 'drizzle-orm';
import { routerBaseContext } from './context';
import { ORPCError } from '@orpc/client';

export const GetSongInput = type({
	id: 'string' // Song ID
});

export const getSongProcedure = routerBaseContext.input(GetSongInput).handler(async ({ input }) => {
	try {
		const songResult = await db.query.song.findFirst({
			where: eq(song.id, input.id),
			with: {
				charts: {
					with: {
						hitObjects: true
					}
				}
			}
		});

		if (!songResult) {
			throw new ORPCError('NOT_FOUND');
		}

		const urlExpirySeconds = 60 * 60 * 24;
		const audioUrl = s3.file(songResult.audioS3Key).presign({
			expiresIn: urlExpirySeconds,
			acl: 'public-read'
		});

		let imageUrl: string | undefined;
		if (songResult.imageS3Key) {
			try {
				imageUrl = s3.file(songResult.imageS3Key).presign({
					expiresIn: urlExpirySeconds,
					acl: 'public-read'
				});
			} catch (imgErr) {
				console.warn(`Failed to presign image URL for key ${songResult.imageS3Key}:`, imgErr);
			}
		}

		return {
			...songResult,
			audioUrl,
			imageUrl
		};
	} catch (e: unknown) {
		console.error(`Error getting song ${input.id}:`, e);
		throw new Error(
			e instanceof Error ? e.message : 'An error occurred while fetching song details.'
		);
	}
});
