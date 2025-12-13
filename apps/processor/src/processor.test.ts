import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';

// Register mocks for this suite only, and restore after.
function installProcessorMocks() {
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
			file: mock(() => ({
				arrayBuffer: mock(async () => new Uint8Array([0x00, 0x01]))
			})),
			write: mock(async () => {}),
			delete: mock(async () => {})
		},
		schema: {
			song: {},
			chart: {},
			chartHitObject: {}
		}
	}));

	mock.module('@mug/game-logic', () => ({
		processFileAndExtractData: mock(async (fileBlob: File) => ({
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
}

describe('Processor Logic', () => {
	beforeAll(() => {
		installProcessorMocks();
	});

	afterAll(() => {
		// Restore the original modules so mocks don't leak to other suites.
		mock.restore();
	});

	it('successfully processes an upload job', async () => {
		const job = { jobId: 'job_1', userId: 'user_1', s3Key: 'uploads/temp.osz' };

		// Import after mocks are registered so dependencies resolve to mocks only within this suite.
		const { processJob } = await import('./job');

		const result = await processJob(job);

		expect(result.success).toBe(true);
		expect(result.songId).toBe('song_123');
		expect(result.title).toBe('Test Song');
	});
});

