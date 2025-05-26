import { db, schema } from 'db';
import { type } from 'arktype';
import { eq } from 'drizzle-orm';
import { routerBaseContext } from './context';
import { ORPCError } from '@orpc/client';
import s3Client from './s3Client';

export const GetSongInput = type({
	id: 'string', // Song ID
});

export const getSongProcedure = routerBaseContext
	.input(GetSongInput)
	// Output will be inferred
	.handler(async ({ input }) => {
		try {
			const songResult = await db.query.song.findFirst({
				where: eq(schema.song.id, input.id),
				with: {
					charts: {
						with: {
							hitObjects: true,
						},
					},
				},
			});

			if (!songResult) {
				throw new ORPCError("NOT_FOUND");
			}



			const urlExpirySeconds = 60 * 60 * 24;
			const audioUrl = s3Client.file(songResult.audioS3Key).presign({
				expiresIn: urlExpirySeconds,
				acl: 'public-read',
			});

			let imageUrl: string | undefined = undefined;
			if (songResult.imageS3Key) {
				try {
					imageUrl = s3Client.file(songResult.imageS3Key).presign({
						expiresIn: urlExpirySeconds,
						acl: 'public-read',
					});
				} catch (imgErr) {
					console.warn(`Failed to presign image URL for key ${songResult.imageS3Key}:`, imgErr);
				}
			}





			return {
				...songResult,
				audioUrl,
				imageUrl,
			};
		} catch (e: any) {
			console.error(`Error getting song ${input.id}:`, e);
			// Throwing an error will be caught by oRPC.
			throw new Error(e.message || `An error occurred while fetching song details.`);
		}
	}); 