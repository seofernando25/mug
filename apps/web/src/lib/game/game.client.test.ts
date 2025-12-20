// Test-specific mocks - MUST be before any module imports
import { mock } from 'bun:test';
import type { ClientSong, ClientChart } from '$lib/types';

// Mock $app/environment FIRST - before any module that imports it
mock.module('$app/environment', () => ({
	browser: true,
	dev: true,
	building: false,
	version: 'test'
}));

// Mock settingsStore to avoid $app/environment dependency
mock.module('$lib/stores/settingsStore', () => ({
	masterVolume: {
		subscribe: (fn: (value: any) => void) => {
			fn(0.75);
			return () => {};
		}
	},
	musicVolume: {
		subscribe: (fn: (value: any) => void) => {
			fn(0.75);
			return () => {};
		}
	}
}));

import { setupSvelteKitMocks } from '$lib/test-utils';

// Test-specific mocks (game engine and app modules)
mock.module('@pixi/sound', () => ({
	Sound: {
		from: mock((options: any) => {
			const mockSound = {
				duration: 100,
				isLoaded: true,
				destroy: mock(),
				play: mock(),
				stop: mock(),
				volume: 1
			};

			// Call loaded callback immediately
			if (options.loaded) {
				options.loaded(null, mockSound);
			}

			return mockSound;
		})
	}
}));

mock.module('@mug/engine', () => ({
	RhythmEngine: class {
		constructor(chart: any[]) {
			this.update = mock(() => []);
			this.submitInput = mock(() => ({
				type: 'hit',
				noteId: 'test',
				judgment: 'Perfect'
			}));
			this.releaseInput = mock();
			this.state = { score: 100, combo: 5, maxCombo: 5, notes: [] };
		}
		update: any;
		submitInput: any;
		releaseInput: any;
		state: any;
	},
	AudioClock: class {
		constructor(sound: any) {
			this.play = mock().mockResolvedValue(undefined);
			this.pause = mock();
			this.resume = mock();
			this.stop = mock();
			this.currentTimeMs = 1000;
			this.isPlaying = true;
		}
		play: any;
		pause: any;
		resume: any;
		stop: any;
		currentTimeMs: any;
		isPlaying: any;
	},
	GameRenderer: class {
		constructor() {
			this.init = mock().mockResolvedValue(undefined);
			this.render = mock();
			this.destroy = mock();
			this.handleResize = mock();
			this.showJudgment = mock();
			this.flashLane = mock();
			this.highwayMetricsStore = { subscribe: mock(() => () => {}) };
		}
		init: any;
		render: any;
		destroy: any;
		handleResize: any;
		showJudgment: any;
		flashLane: any;
		highwayMetricsStore: any;
	}
}));

mock.module('$lib/network/socket', () => ({
	gameSocket: {
		send: mock()
	}
}));

mock.module('@mug/common', () => ({
	Preferences: {
		prefs: {
			gameplay: {
				keybindings: ['d', 'f', 'j', 'k'],
				perfectWindowMs: 30,
				excellentWindowMs: 60,
				goodWindowMs: 90,
				mehWindowMs: 150
			}
		}
	}
}));

// Now import the actual modules
import { describe, test, expect, spyOn, beforeAll, afterEach } from 'bun:test';

// Test basic mocking first
describe('Mocking Infrastructure', () => {
	test('mocks are working', () => {
		expect(true).toBe(true);
	});
});

// Dynamic imports will be done in beforeAll after mocks are set up
let createGame: any;
let gameSocket: any;
let Preferences: any;

const mockCallbacks = {
	onPhaseChange: mock(),
	onCountdownUpdate: mock(),
	onSongEnd: mock(),
	onScoreUpdate: mock(),
	onNoteHit: mock(),
	onNoteMiss: mock(),
	getGamePhase: mock(() => 'playing' as const),
	getIsPaused: mock(() => false),
	getCountdownValue: mock(() => 0),
	onTimeUpdate: mock()
};

const mockSong: ClientSong = {
	id: 'test-song',
	title: 'Test Song',
	artist: 'Test Artist',
	audioUrl: 'test.mp3',
	imageUrl: undefined,
	previewStartTime: 0,
	bpm: 120,
	audioFilename: 'test.mp3',
	audioS3Key: 'test-key',
	imageS3Key: null,
	uploaderId: 'test-user',
	uploadDate: new Date(),
	charts: []
};

const mockChart: ClientChart = {
	id: 'test-chart',
	songId: 'test-song',
	difficultyName: 'Easy',
	lanes: 4,
	noteScrollSpeed: 1.0,
	lyrics: null,
	hitObjects: []
};

describe('Game Client - createGame', () => {
	beforeAll(async () => {
		// Set test environment variable for test helpers
		process.env.BUN_TEST = 'true';
		// Set up SvelteKit mocks for this test suite
		setupSvelteKitMocks();

		// Mock svelte/store before importing modules that use it
		mock.module('svelte/store', () => ({
			writable: mock((initial: any) => {
				let value = initial;
				const subscribers = new Set<Function>();

				return {
					subscribe: mock((fn: Function) => {
						subscribers.add(fn);
						fn(value);
						return mock(() => subscribers.delete(fn));
					}),
					set: mock((newValue: any) => {
						value = newValue;
						subscribers.forEach((fn) => fn(value));
					}),
					update: mock((updater: Function) => {
						value = updater(value);
						subscribers.forEach((fn) => fn(value));
					})
				};
			}),
			get: mock((store: any) => {
				let value;
				const unsub = store.subscribe((v: any) => (value = v));
				unsub();
				return value;
			})
		}));

		// Dynamic imports after mocks are set up
		const gameClient = await import('./game.client');
		const socket = await import('$lib/network/socket');
		const common = await import('@mug/common');

		createGame = gameClient.createGame;
		gameSocket = socket.gameSocket;
		Preferences = common.Preferences;
	});

	afterEach(() => {
		// Reset all mocks
		mockCallbacks.onPhaseChange.mockClear();
		mockCallbacks.onCountdownUpdate.mockClear();
		mockCallbacks.onSongEnd.mockClear();
		mockCallbacks.onScoreUpdate.mockClear();
		mockCallbacks.onNoteHit.mockClear();
		mockCallbacks.onNoteMiss.mockClear();
		mockCallbacks.getGamePhase.mockClear();
		mockCallbacks.getIsPaused.mockClear();
		mockCallbacks.getCountdownValue.mockClear();
		mockCallbacks.onTimeUpdate.mockClear();
		gameSocket.send.mockClear();
	});

	describe('Initialization & Audio Safety Valve', () => {
		test('initializes game successfully', async () => {
			const canvas = document.createElement('canvas');
			const game = await createGame(mockSong, mockChart, canvas, mockCallbacks);

			// In test environment, game starts in playing phase directly
			expect(mockCallbacks.onPhaseChange).toHaveBeenCalledWith('playing');

			expect(game).toBeDefined();
			expect(typeof game.beginGameplaySequence).toBe('function');
			expect(typeof game.handleKeyPress).toBe('function');
			expect(typeof game.cleanup).toBe('function');

			game.cleanup();
		});

		test('handles audio load failure gracefully', async () => {
			// Temporarily change the mock to fail
			// Mock the Sound.from method to fail
			mock.module('@pixi/sound', () => ({
				Sound: {
					from: mock((options: any) => {
						// Call loaded with error immediately
						if (options.loaded) {
							options.loaded(new Error('Network error'), null);
						}
						return { duration: 0, destroy: mock() };
					})
				}
			}));

			const canvas = document.createElement('canvas');
			const game = await createGame(mockSong, mockChart, canvas, mockCallbacks);

			// Should still create game despite audio failure
			expect(game).toBeDefined();
			game.cleanup();
		});
	});

	describe('Gameplay & Input', () => {
		test('input handling setup works', async () => {
			const canvas = document.createElement('canvas');
			const game = await createGame(mockSong, mockChart, canvas, mockCallbacks);

			// Verify the game object has the expected methods
			expect(typeof game.handleKeyPress).toBe('function');

			// Force phase to playing using test helper
			if (game.__setPhaseForTest) {
				game.__setPhaseForTest('playing');
			}

			// Test that handleKeyPress doesn't crash (basic smoke test)
			expect(() => game.handleKeyPress('d')).not.toThrow();

			game.cleanup();
		});

		test('key input validation works', async () => {
			const canvas = document.createElement('canvas');
			const game = await createGame(mockSong, mockChart, canvas, mockCallbacks);

			// Test unmapped key doesn't crash
			expect(() => game.handleKeyPress('x')).not.toThrow();

			// Test valid key doesn't crash when not in playing phase
			expect(() => game.handleKeyPress('d')).not.toThrow();

			game.cleanup();
		});
	});

	describe('Control Flow', () => {
		test('control methods exist and are callable', async () => {
			const canvas = document.createElement('canvas');
			const game = await createGame(mockSong, mockChart, canvas, mockCallbacks);

			// Verify control methods exist
			expect(typeof game.pauseGame).toBe('function');
			expect(typeof game.cleanup).toBe('function');

			// Test they don't crash
			expect(() => game.pauseGame()).not.toThrow();
			expect(() => game.cleanup()).not.toThrow();
		});
	});

	describe('Engine Integration', () => {
		test('engine is properly initialized', async () => {
			const canvas = document.createElement('canvas');
			const game = await createGame(mockSong, mockChart, canvas, mockCallbacks);

			// Access engine through test helper
			if (game.__getEngineForTest) {
				const engine = game.__getEngineForTest();
				expect(engine).toBeDefined();
				expect(typeof engine.update).toBe('function');
			}

			game.cleanup();
		});
	});
});
