import type { UploadJob } from "@mug/contract";
import { processFileAndExtractData } from "@mug/game-logic";
import { randomUUIDv7 } from "bun";
import { chart, chartHitObject, db, getRedis, s3, song } from "../index";

/**
 * Installs a song by processing the file, uploading assets to S3, and storing metadata in the database.
 * This is the core business logic extracted from the RPC layer for reusability.
 *
 * @param file - The uploaded File object containing the .osz archive
 * @param uploaderId - The ID of the user uploading the song
 * @returns Promise resolving to the installation result
 */
export async function installSong(
	file: File,
	uploaderId: string,
): Promise<{
	success: true;
	message: string;
	title: string;
	songId: string;
}> {
	// Process the uploaded file
	let processedData: Awaited<
		ReturnType<typeof processFileAndExtractData>
	> | null = null;
	try {
		processedData = await processFileAndExtractData(file);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to process file: ${errorMessage}`);
	}

	if (!processedData) {
		throw new Error("Failed to process file");
	}

	// Generate UUID for the song
	const songUUID = randomUUIDv7();

	// Prepare audio upload
	const audioFilename = processedData.metadata.audioFilename;
	const audioContent = processedData.audioContent;
	const audioS3Key = `songs/${songUUID}/audio/${audioFilename}`;
	let audioContentType = "application/octet-stream"; // Default
	if (audioFilename.toLowerCase().endsWith(".mp3"))
		audioContentType = "audio/mpeg";
	else if (audioFilename.toLowerCase().endsWith(".wav"))
		audioContentType = "audio/wav";
	else if (audioFilename.toLowerCase().endsWith(".ogg"))
		audioContentType = "audio/ogg";

	// Handle image upload (optional)
	let imageS3Key: string | null = null;
	if (processedData.imageContent && processedData.metadata.imageFilename) {
		const imageFilename = processedData.metadata.imageFilename;
		imageS3Key = `songs/${songUUID}/image/${imageFilename}`;
		let imageContentType = "application/octet-stream";
		if (
			imageFilename.toLowerCase().endsWith(".jpg") ||
			imageFilename.toLowerCase().endsWith(".jpeg")
		)
			imageContentType = "image/jpeg";
		else if (imageFilename.toLowerCase().endsWith(".png"))
			imageContentType = "image/png";
		else if (imageFilename.toLowerCase().endsWith(".gif"))
			imageContentType = "image/gif";

		try {
			await s3.write(imageS3Key, processedData.imageContent, {
				type: imageContentType,
			});
		} catch (s3Err: unknown) {
			console.warn(
				`Warning: Failed to upload image ${imageS3Key} to S3:`,
				s3Err instanceof Error ? s3Err.message : String(s3Err),
			);
			imageS3Key = null;
		}
	}

	// Upload audio (required)
	try {
		await s3.write(audioS3Key, audioContent, { type: audioContentType });
	} catch (s3Err: unknown) {
		const errorMessage = (s3Err as Error)?.message || "Unknown S3 error";
		throw new Error(`Failed to upload audio file to storage: ${errorMessage}`);
	}

	// Validate song data (basic validation)
	const validatedSongData = {
		id: songUUID,
		title: processedData.metadata.title,
		artist: processedData.metadata.artist,
		bpm: processedData.metadata.bpm,
		audioFilename: audioFilename,
		audioS3Key: audioS3Key,
		imageS3Key: imageS3Key,
		uploaderId: uploaderId,
		previewStartTime: processedData.metadata.previewStartTime ?? 0,
	};

	// Execute database transaction
	try {
		await db.transaction(async (tx) => {
			const newSong = await tx
				.insert(song)
				.values(validatedSongData)
				.returning({ id: song.id });
			const newSongId = newSong[0].id;

			// Process each chart
			for (let i = 0; i < processedData.charts.length; i++) {
				const chartData = processedData.charts[i];
				const hitObjectsForChart = processedData.hitObjects[i];

				// Validate chart data (basic validation)
				const validatedChartData = {
					songId: newSongId,
					difficultyName: chartData.difficultyName || "Unknown Difficulty",
					lanes: chartData.lanes || 4,
					noteScrollSpeed: chartData.noteScrollSpeed ?? 1.0,
					lyrics: chartData.lyrics
						? typeof chartData.lyrics === "string"
							? JSON.parse(chartData.lyrics)
							: chartData.lyrics
						: null,
				};

				// Insert chart
				const newChart = await tx
					.insert(chart)
					.values(validatedChartData)
					.returning({ id: chart.id });
				const newChartId = newChart[0].id;

				// Insert hit objects if present
				if (
					hitObjectsForChart &&
					Array.isArray(hitObjectsForChart) &&
					hitObjectsForChart.length > 0
				) {
					const hitObjectInserts = hitObjectsForChart.map((ho) => {
						// Warn about holds without duration
						if (ho.type === "hold" && ho.duration === null) {
							console.warn(
								`Hold with no duration at time ${ho.time} for chart ${i}`,
							);
						}

						return {
							chartId: newChartId,
							time: ho.time,
							lane: ho.lane,
							note_type: ho.type,
							duration: ho.duration ?? null,
						};
					});

					await tx.insert(chartHitObject).values(hitObjectInserts);
				}
			}
		});

		return {
			success: true,
			message: `Song "${processedData.metadata.title}" installed successfully!`,
			title: processedData.metadata.title,
			songId: songUUID,
		};
	} catch (err) {
		const errorMessage =
			err instanceof Error
				? err.message
				: "Failed to install song due to an internal error.";
		throw new Error(errorMessage);
	}
}

/**
 * Queues a song upload for asynchronous processing via the job queue.
 * This is used when USE_PROCESSOR is enabled.
 *
 * @param file - The uploaded File object containing the .osz archive
 * @param uploaderId - The ID of the user uploading the song
 * @param queueKey - The Redis queue key (defaults to 'upload-jobs')
 * @returns Promise resolving to the job result
 */
export async function queueSongUpload(
	file: File,
	uploaderId: string,
	queueKey: string = "upload-jobs",
): Promise<{
	success: true;
	message: string;
	jobId: string;
}> {
	const jobId = randomUUIDv7();
	const s3Key = `uploads/${jobId}.osz`;

	try {
		// Upload raw file to S3 for processing
		const buffer = new Uint8Array(await file.arrayBuffer());
		await s3.write(s3Key, buffer, {
			type: file.type || "application/octet-stream",
		});

		// Create job data
		const job: UploadJob = {
			jobId,
			userId: uploaderId,
			s3Key,
		};

		// Queue job in Redis
		const redis = getRedis();
		await redis.rpush(queueKey, JSON.stringify(job));

		return {
			success: true,
			message: "Processing started",
			jobId,
		};
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to enqueue processing job: ${errorMessage}`);
	}
}
