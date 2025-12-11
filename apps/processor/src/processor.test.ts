import { describe, it, expect, mock } from 'bun:test';
import { processJob } from './job';

mock.module('@mug/db', () => ({
	db: {
		transaction: mock(async (cb) =>
			cb({
				insert: () => ({
					values: () => ({
						returning: () => [{ id: 'song_123', title: 'Test Song' }]
					})
				})
			})
		)
	},
	s3: {
		send: mock(async (cmd) => {
			const name = cmd.constructor.name;
			if (name === 'GetObjectCommand') {
				return {
					Body: {
						transformToByteArray: async () => new Uint8Array([0x00, 0x01])
					}
				};
			}
			return {};
		})
	},
	schema: {
		song: {},
		chart: {},
		chartHitObject: {}
	}
}));

mock.module('@mug/game-logic', () => ({
	processFileAndExtractData: mock(async () => ({
		metadata: {
			title: 'Test Song',
			artist: 'Artist',
			bpm: 120,
			audioFilename: 'audio.mp3',
			imageFilename: null,
			previewStartTime: 0
		},
		audioContent: new Uint8Array([0x00, 0x01]),
		imageContent: null,
		charts: [
			{
				difficultyName: 'Normal',
				lanes: 4,
				noteScrollSpeed: 1
			}
		],
		hitObjects: [
			[
				{ time: 1000, lane: 0, type: 'tap', duration: null },
				{ time: 1500, lane: 1, type: 'tap', duration: null }
			]
		]
	}))
}));

// Mock AWS SDK for both job.ts and this test file
mock.module('@aws-sdk/client-s3', () => ({
	GetObjectCommand: class {},
	PutObjectCommand: class {},
	DeleteObjectCommand: class {}
}));

describe('Processor Logic', () => {
	it('successfully processes an upload job', async () => {
		const job = { jobId: 'job_1', userId: 'user_1', s3Key: 'uploads/temp.osz' };

		const result = await processJob(job);

		expect(result.success).toBe(true);
		expect(result.songId).toBe('song_123');
		expect(result.title).toBe('Test Song');
	});
});

