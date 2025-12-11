import { assertUploadJob, type UploadJob } from '@mug/contract';
import { db, chart, chartHitObject, song, getRedis, s3 } from '@mug/db';
import { processFileAndExtractData } from '@mug/game-logic';
import { randomUUIDv7 } from 'bun';
import { lookup } from 'mime-types';

const QUEUE_KEY = process.env.UPLOAD_QUEUE_KEY ?? 'upload-jobs';
const POLL_DELAY_MS = 2000;

async function main() {
	const redis = getRedis();
	console.log(`🛠️ Processor worker listening on Redis queue "${QUEUE_KEY}"`);
	while (true) {
		try {
			const res = await redis.blPop(QUEUE_KEY, 0);
			if (!res) continue;
			const raw = res.element;
			let job: UploadJob;
			try {
				job = JSON.parse(raw);
				assertUploadJob(job);
			} catch (err) {
				console.error('Invalid job payload, discarding', err, raw);
				continue;
			}
			await handleJob(job);
		} catch (err) {
			console.error('Worker loop error, continuing', err);
			await delay(POLL_DELAY_MS);
		}
	}
}

async function handleJob(job: UploadJob) {
	try {
		console.log(`📥 Downloading ${job.s3Key}...`);
		const fileHandle = s3.file(job.s3Key);
		const raw = await fileHandle.arrayBuffer();
		if (!raw) throw new Error('Empty file from S3');
		const fileName = job.s3Key.split('/').pop() ?? 'upload.osz';
		const file = new File([raw], fileName);

		console.log(`🔨 Parsing ${job.jobId}...`);
		const processedData = await processFileAndExtractData(file);

		const songUUID = randomUUIDv7();
		const audioKey = `songs/${songUUID}/audio/${processedData.metadata.audioFilename}`;
		const audioContentType = lookup(processedData.metadata.audioFilename) || 'application/octet-stream';
		await s3.write(audioKey, processedData.audioContent, { type: audioContentType });

		let imageKey: string | null = null;
		if (processedData.imageContent && processedData.metadata.imageFilename) {
			imageKey = `songs/${songUUID}/image/${processedData.metadata.imageFilename}`;
			const imageContentType = lookup(processedData.metadata.imageFilename) || 'application/octet-stream';
			try {
				await s3.write(imageKey, processedData.imageContent, { type: imageContentType });
			} catch (err) {
				console.warn(`Image upload failed for ${imageKey}`, err);
				imageKey = null;
			}
		}

		await db.transaction(async (tx) => {
			const [newSong] = await tx.insert(song).values({
				id: songUUID,
				title: processedData.metadata.title,
				artist: processedData.metadata.artist,
				bpm: processedData.metadata.bpm,
				audioFilename: processedData.metadata.audioFilename,
				audioS3Key: audioKey,
				imageS3Key: imageKey,
				uploaderId: job.userId,
				previewStartTime: processedData.metadata.previewStartTime ?? 0,
			}).returning({ id: song.id });

			const newSongId = newSong.id;

			for (let i = 0; i < processedData.charts.length; i++) {
				const chartData = processedData.charts[i];
				const hitObjectsForChart = processedData.hitObjects[i];

				const [newChart] = await tx.insert(chart).values({
					songId: newSongId,
					difficultyName: chartData.difficultyName || 'Unknown Difficulty',
					lanes: chartData.lanes || 4,
					noteScrollSpeed: chartData.noteScrollSpeed ?? 1.0,
					lyrics: chartData.lyrics ? (typeof chartData.lyrics === 'string' ? JSON.parse(chartData.lyrics) : chartData.lyrics) : null,
				}).returning({ id: chart.id });

				const newChartId = newChart.id;

				if (hitObjectsForChart && Array.isArray(hitObjectsForChart) && hitObjectsForChart.length > 0) {
					const hitObjectInserts = hitObjectsForChart.map((ho) => ({
						chartId: newChartId,
						time: ho.time,
						lane: ho.lane,
						note_type: ho.type,
						duration: ho.duration ?? null,
					}));
					await tx.insert(chartHitObject).values(hitObjectInserts);
				}
			}
		});

		console.log(`✅ Job ${job.jobId} Complete!`);
		await s3.delete(job.s3Key);
	} catch (err) {
		console.error(`❌ Job ${job.jobId} failed`, err);
		// Poison-job guardrail: do not re-queue.
	}
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
	console.error('Processor fatal error', err);
});

