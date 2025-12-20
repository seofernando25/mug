import { assertUploadJob, type UploadJob } from '@mug/contract';
import { processJob } from './job';
import { redis } from 'bun';

const QUEUE_KEY = process.env.UPLOAD_QUEUE_KEY ?? 'upload-jobs';
const POLL_DELAY_MS = 2000;

async function main() {
	console.log(`🛠️ Processor worker listening on Redis queue "${QUEUE_KEY}"`);
	while (true) {
		try {
			// Bun's blpop returns [key, element] or null
			const result = await redis.blpop(QUEUE_KEY, 0);
			if (!result) continue;
			const [, raw] = result; // Destructure to get the element
			let job: UploadJob;
			try {
				job = JSON.parse(raw);
				assertUploadJob(job);
			} catch (err) {
				console.error('Invalid job payload, discarding', err, raw);
				continue;
			}
			await processJob(job);
		} catch (err) {
			console.error('Worker loop error, continuing', err);
			await delay(POLL_DELAY_MS);
		}
	}
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
	console.error('Processor fatal error', err);
});
