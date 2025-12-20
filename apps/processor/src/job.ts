import { db, s3, schema } from '@mug/db';
import { processFileAndExtractData } from '@mug/game-logic';
import mime from 'mime-types';

export interface UploadJob {
	jobId: string;
	userId: string;
	s3Key: string;
}

export async function processJob(job: UploadJob) {
	console.log(`📥 Processing Job: ${job.jobId}`);

	// 1. Download
	const file = s3.file(job.s3Key);
	const arrayBuffer = await file.arrayBuffer();

	// 2. Create a File object with proper filename for parsing
	const filename = job.s3Key.split('/').pop() || 'uploaded.osz';
	const fileBlob = new File([arrayBuffer], filename, {
		type: 'application/octet-stream'
	});

	// 3. Parse (reuse shared game-logic parser)
	const parsed = await processFileAndExtractData(fileBlob);

	// 3. Upload assets
	const audioKey = `songs/${job.jobId}/audio/${parsed.metadata.audioFilename}`;
	await s3.write(audioKey, parsed.audioContent, {
		type: mime.lookup(parsed.metadata.audioFilename) || 'application/octet-stream'
	});

	let imageKey: string | null = null;
	if (parsed.imageContent && parsed.metadata.imageFilename) {
		imageKey = `songs/${job.jobId}/image/${parsed.metadata.imageFilename}`;
		await s3.write(imageKey, parsed.imageContent, {
			type: mime.lookup(parsed.metadata.imageFilename) || 'application/octet-stream'
		});
	}

	// 4. DB write
	const result = await db.transaction(async (tx) => {
		const [songRow] = await tx
			.insert(schema.song)
			.values({
				id: job.jobId,
				title: parsed.metadata.title,
				artist: parsed.metadata.artist,
				bpm: parsed.metadata.bpm,
				audioFilename: parsed.metadata.audioFilename,
				audioS3Key: audioKey,
				imageS3Key: imageKey,
				uploaderId: job.userId,
				previewStartTime: parsed.metadata.previewStartTime ?? 0
			})
			.returning({ id: schema.song.id });

		for (let i = 0; i < parsed.charts.length; i++) {
			const chartData = parsed.charts[i];
			const hitObjects = parsed.hitObjects[i];
			const [chartRow] = await tx
				.insert(schema.chart)
				.values({
					songId: songRow.id,
					difficultyName: chartData.difficultyName || 'Normal',
					lanes: chartData.lanes || 4,
					noteScrollSpeed: chartData.noteScrollSpeed ?? 1.0,
					lyrics: chartData.lyrics ?? null
				})
				.returning({ id: schema.chart.id });

			if (hitObjects?.length) {
				await tx.insert(schema.chartHitObject).values(
					hitObjects.map((ho) => ({
						chartId: chartRow.id,
						time: ho.time,
						lane: ho.lane,
						note_type: ho.type,
						duration: ho.duration ?? null
					}))
				);
			}
		}

		return songRow;
	});

	// 5. Cleanup temp upload
	await s3.delete(job.s3Key);

	return { success: true, songId: result.id, title: parsed.metadata.title };
}
