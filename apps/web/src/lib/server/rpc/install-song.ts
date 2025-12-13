import { installSong, queueSongUpload } from '@mug/db';
import { ORPCError } from '@orpc/server';
import { type } from 'arktype';
import { USE_PROCESSOR } from '$lib/featureFlags';
import { requireAuth } from './middleware/auth';
import { routerBaseContext } from './context';

const InstallSongInput = type({
	file: 'File',
});

export const installSongProcedure = routerBaseContext
	.use(requireAuth)
	.input(InstallSongInput)
	.handler(async ({ input, context }) => {
		const uploaderId = context.auth.user.id;
		const uploadedFile = input.file;

		try {
			if (USE_PROCESSOR) {
				// Async processing path - queue for background processing
				const queueKey = process.env.UPLOAD_QUEUE_KEY ?? 'upload-jobs';
				const result = await queueSongUpload(uploadedFile, uploaderId, queueKey);
				return result;
			} else {
				// Sync processing path - process immediately
				const result = await installSong(uploadedFile, uploaderId);
				return result;
			}
		} catch (err) {
			console.error('Song installation failed:', err);
			const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

			if (errorMessage.includes('Failed to process file')) {
				throw new ORPCError('BAD_REQUEST', { message: errorMessage });
			} else {
				throw new ORPCError('INTERNAL_SERVER_ERROR', { message: errorMessage });
			}
		}
	});