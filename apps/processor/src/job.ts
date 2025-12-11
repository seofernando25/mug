import { db, s3, schema } from '@mug/db';
import { processFileAndExtractData } from '@mug/game-logic';
// Allow S3 client to be mocked in tests; fall back to local mock if not resolvable
let GetObjectCommand: any;
let PutObjectCommand: any;
let DeleteObjectCommand: any;
async function loadAws() {
	try {
		const mod = await import('@aws-sdk/client-s3');
		GetObjectCommand = mod.GetObjectCommand;
		PutObjectCommand = mod.PutObjectCommand;
		DeleteObjectCommand = mod.DeleteObjectCommand;
	} catch {
		const mod = await import('./aws-mock');
		GetObjectCommand = mod.GetObjectCommand;
		PutObjectCommand = mod.PutObjectCommand;
		DeleteObjectCommand = mod.DeleteObjectCommand;
	}
}
import mime from 'mime-types';

export interface UploadJob {
	jobId: string;
	userId: string;
	s3Key: string;
}

export async function processJob(job: UploadJob) {
	console.log(`📥 Processing Job: ${job.jobId}`);
	await loadAws();

	// 1. Download
	const { Body } = await s3.send(
		new GetObjectCommand({
			Bucket: process.env.S3_BUCKET,
			Key: job.s3Key
		})
	);
	if (!Body) throw new Error('Failed to download file from S3');
	const arrayBuffer = await Body.transformToByteArray();

	// 2. Parse (reuse shared game-logic parser)
	const parsed = await processFileAndExtractData(arrayBuffer, job.s3Key, job.jobId);

	// 3. Upload assets
	const audioKey = `songs/${job.jobId}/audio/${parsed.metadata.audioFilename}`;
	await s3.send(
		new PutObjectCommand({
			Bucket: process.env.S3_BUCKET,
			Key: audioKey,
			Body: parsed.audioContent,
			ContentType: mime.lookup(parsed.metadata.audioFilename) || 'application/octet-stream'
		})
	);

	let imageKey: string | null = null;
	if (parsed.imageContent && parsed.metadata.imageFilename) {
		imageKey = `songs/${job.jobId}/image/${parsed.metadata.imageFilename}`;
		await s3.send(
			new PutObjectCommand({
				Bucket: process.env.S3_BUCKET,
				Key: imageKey,
				Body: parsed.imageContent,
				ContentType: mime.lookup(parsed.metadata.imageFilename) || 'application/octet-stream'
			})
		);
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
	await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: job.s3Key }));

	return { success: true, songId: result.id, title: parsed.metadata.title };
}

