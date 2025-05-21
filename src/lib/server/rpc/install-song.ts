import { db } from '$lib/server/db';
import { chart, chartHitObject, song } from '$lib/server/db/music-schema';
import { ORPCError } from '@orpc/server';
import { type } from 'arktype';
import { randomUUIDv7 } from 'bun';
import { createInsertSchema } from 'drizzle-arktype';
import { processFileAndExtractData } from '../conversion';
import s3Client from '../s3';
import { requireAuth } from './middleware/auth';
import { routerBaseContext } from './context';

const songInsertSchema = createInsertSchema(song).omit("uploadDate");
const chartInsertSchema = createInsertSchema(chart).omit("id");
const chartHitObjectInsertSchema = createInsertSchema(chartHitObject).omit("id");

const InstallSongInput = type({
	file: 'File',
});

export const installSongProcedure = routerBaseContext
	.use(requireAuth)
	.input(InstallSongInput)
	.handler(async ({ input, context }) => {
		const uploaderId = context.auth.user.id;
		const uploadedFile = input.file;

		let processedData: Awaited<ReturnType<typeof processFileAndExtractData>> | null = null;
		try {
			processedData = await processFileAndExtractData(uploadedFile);
		} catch (err: any) {
			console.error('Error during file processing:', err);
			throw new ORPCError('BAD_REQUEST', { message: `Failed to process file: ${err.message}` });
		}

		if (!processedData) {
			throw new ORPCError('BAD_REQUEST', { message: 'Failed to process file' });
		}

		const songUUID = randomUUIDv7();
		const audioFilename = processedData.metadata.audioFilename;
		const audioContent = processedData.audioContent;
		const audioS3Key = `songs/${songUUID}/audio/${audioFilename}`;
		let audioContentType = 'application/octet-stream'; // Default
		if (audioFilename.toLowerCase().endsWith('.mp3')) audioContentType = 'audio/mpeg';
		else if (audioFilename.toLowerCase().endsWith('.wav')) audioContentType = 'audio/wav';
		else if (audioFilename.toLowerCase().endsWith('.ogg')) audioContentType = 'audio/ogg';

		let imageS3Key: string | null = null;
		if (processedData.imageContent && processedData.metadata.imageFilename) {
			const imageFilename = processedData.metadata.imageFilename;
			imageS3Key = `songs/${songUUID}/image/${imageFilename}`;
			let imageContentType = 'application/octet-stream';
			if (imageFilename.toLowerCase().endsWith('.jpg') || imageFilename.toLowerCase().endsWith('.jpeg')) imageContentType = 'image/jpeg';
			else if (imageFilename.toLowerCase().endsWith('.png')) imageContentType = 'image/png';
			else if (imageFilename.toLowerCase().endsWith('.gif')) imageContentType = 'image/gif';

			try {
				await s3Client.write(imageS3Key, processedData.imageContent, { type: imageContentType });
			} catch (s3Err: any) {
				console.warn(`Warning: Failed to upload image ${imageS3Key} to S3:`, s3Err.message);
				imageS3Key = null; // Proceed without image if upload fails
			}
		}

		try {
			await s3Client.write(audioS3Key, audioContent, { type: audioContentType });
		} catch (s3Err: any) {
			console.error(`Fatal Error: Failed to upload audio ${audioS3Key} to S3:`, s3Err.message);
			throw new ORPCError('INTERNAL_SERVER_ERROR', { message: `Failed to upload audio file to storage: ${s3Err.message || 'Unknown S3 error'}` });
		}


		const songValidationResult = songInsertSchema({
			id: songUUID,
			title: processedData.metadata.title,
			artist: processedData.metadata.artist,
			bpm: processedData.metadata.bpm,
			audioFilename: audioFilename,
			audioS3Key: audioS3Key,
			uploaderId: uploaderId,
			previewStartTime: processedData.metadata.previewStartTime ?? 0,
		});
		if (songValidationResult instanceof type.errors) {
			console.error('Song schema validation failed:', songValidationResult.issues);
			// Consider cleaning up S3 objects if validation fails here
			throw new ORPCError('BAD_REQUEST', { message: 'Processed song data is invalid: ' + songValidationResult.issues.map(i => i.message).join(', ') });
		}
		const validatedSongData = songValidationResult;

		try {
			await db.transaction(async (tx) => {
				const newSong = await tx.insert(song).values(validatedSongData).returning({ id: song.id });
				const newSongId = newSong[0].id;

				for (let i = 0; i < processedData.charts.length; i++) {
					const chartData = processedData.charts[i];
					const hitObjectsForChart = processedData.hitObjects[i]; // Array of hit objects for this chart



					const chartValidationResult = chartInsertSchema({
						songId: newSongId,
						difficultyName: chartData.difficultyName || 'Unknown Difficulty',
						lanes: chartData.lanes || 4,
						noteScrollSpeed: chartData.noteScrollSpeed ?? 1.0, // Default from schema is 1.0
						lyrics: chartData.lyrics ? (typeof chartData.lyrics === 'string' ? JSON.parse(chartData.lyrics) : chartData.lyrics) : null,
					});
					if (chartValidationResult instanceof type.errors) {
						console.error(`Chart ${i} schema validation failed:`, chartValidationResult.issues);
						// No explicit tx.rollback(); Drizzle handles rollback on throw
						throw new Error(`Processed chart data for chart ${i} is invalid: ${chartValidationResult.issues.map(i => i.message).join(', ')}`);
					}
					const validatedChartData = chartValidationResult;

					const newChart = await tx.insert(chart).values(validatedChartData).returning({ id: chart.id });
					const newChartId = newChart[0].id;

					if (hitObjectsForChart && Array.isArray(hitObjectsForChart) && hitObjectsForChart.length > 0) {
						const hitObjectInserts = hitObjectsForChart.map((ho) => {

							const hoValidationResult = chartHitObjectInsertSchema({
								chartId: newChartId,
								time: ho.time,
								lane: ho.lane,
								note_type: ho.type,
								duration: ho.duration ?? null,
							});

							// If hold and duration is null console.warn
							if (ho.type === 'hold' && ho.duration === null) {
								console.warn(`Hold with no duration at time ${ho.time} for chart ${i}`);
							}

							if (hoValidationResult instanceof type.errors) {
								console.error(`Hit object validation failed for chart ${i}, time ${ho.time}:`, hoValidationResult.summary);
								throw new Error(`Processed hit object data for chart ${i}, time ${ho.time} is invalid. ${hoValidationResult.summary}`);
							}
							return hoValidationResult;
						});
						await tx.insert(chartHitObject).values(hitObjectInserts);
					}
				}
			});

			return { success: true, message: `Song "${processedData.metadata.title}" installed successfully!`, title: processedData.metadata.title };

		} catch (err: any) {
			console.error('Error during DB transaction or final processing:', err.message);
			// Consider cleaning up S3 objects if DB transaction failed
			const statusCode = err.message?.startsWith('Processed') || err.message?.startsWith('Invalid') ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR';
			const displayMessage = err.message || 'Failed to install song due to an internal error.';
			throw new ORPCError(statusCode as any, { message: displayMessage });
		}
	}); 