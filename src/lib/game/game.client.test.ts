import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test';
import type { ClientChart, ClientSong } from '$lib/types';

// Mock renderer to avoid Pixi usage in tests
mock.module('$lib/game-engine/renderer', () => ({
	GameRenderer: class {
		async init() {}
		render() {}
		flashLane() {}
		showJudgment() {}
		handleResize() {}
		destroy() {}
	}
}));

// Mock AudioClock with controllable time and expose the instance
let clockRef: any = null;
mock.module('$lib/game-engine/clock', () => {
	class FakeClock {
		currentTimeMs = 0;
		async play() {}
		pause() {}
		resume() {}
		stop() {}
	}
	return {
		AudioClock: class extends FakeClock {
			constructor() {
				super();
				clockRef = this;
			}
		},
		__clockRef: () => clockRef
	};
});

// Mock Preferences to ensure 'd' maps to lane 0
mock.module('$lib/preferences', () => ({
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

// Mock socket
const mockSocketSend = mock(() => {});
mock.module('$lib/network/socket', () => ({
	gameSocket: {
		isConnected: true,
		send: mockSocketSend
	}
}));

// Mock SvelteKit env
mock.module('$app/environment', () => ({
	browser: false
}));

// Mock Sound
mock.module('@pixi/sound', () => ({
	Sound: {
		from: () => ({
			isLoaded: true,
			duration: 10,
			once: (_evt: string, fn: () => void) => fn(),
			play: async () => ({
				stop: () => {},
				set: () => {}
			}),
			destroy: () => {},
			volume: 1
		})
	}
}));

// Capture RAF loop
const originalRAF = global.requestAnimationFrame;
const originalCancelRAF = global.cancelAnimationFrame;
let rafCallback: (time: number) => void;

// Make countdown instantaneous
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

beforeAll(() => {
	global.requestAnimationFrame = (cb: any) => {
		rafCallback = cb;
		return 1 as any;
	};
	global.cancelAnimationFrame = () => {};
	global.setInterval = (cb: any) => {
		// run three ticks immediately
		cb();
		cb();
		cb();
		return 1 as any;
	};
	global.clearInterval = () => {};
	// minimal canvas
	(global as any).HTMLCanvasElement = class {};
});

afterAll(() => {
	global.requestAnimationFrame = originalRAF;
	global.cancelAnimationFrame = originalCancelRAF;
	global.setInterval = originalSetInterval;
	global.clearInterval = originalClearInterval;
});

describe('Game Conductor (headless simulation)', () => {
	it('accepts input and updates score/combos (auto-player)', async () => {
		process.env.BUN_TEST = '1';
		const { createGame } = await import('./game.client');
		const { __clockRef } = await import('$lib/game-engine/clock');
		const chart: ClientChart = {
			id: 'test',
			lanes: 4,
			hitObjects: [{ id: 1, time: 1000, lane: 0, note_type: 'tap', duration: null, chartId: '' }],
			noteScrollSpeed: 1
		} as any;
		const song: ClientSong = { audioUrl: 'mock.mp3', id: 'song', title: 't', artist: 'a', bpm: 120 } as any;
		const canvas = new HTMLCanvasElement();

		const onScoreUpdate = mock(() => {});
		const onNoteHit = mock(() => {});

		const game = await createGame(song, chart, canvas, {
			onPhaseChange: () => {},
			onCountdownUpdate: () => {},
			onSongEnd: () => {},
			onScoreUpdate,
			onNoteHit,
			onNoteMiss: () => {},
			getGamePhase: () => 'playing',
			getIsPaused: () => false,
			getCountdownValue: () => 0
		});

		// Allow startSequence async play to resolve
		await Promise.resolve();
		// Advance time to the note and press the key
		const c = __clockRef();
		if (!c) throw new Error('Clock mock not initialized');
		c.currentTimeMs = 1000;
		// Force phase to playing in headless mode
		(game as any).__setPhaseForTest?.('playing');
		game.handleKeyPress('d');

		// Run one frame
		if (!rafCallback) throw new Error('Game Loop did not start!');
		rafCallback(1000);

		expect(onNoteHit).toHaveBeenCalled();
		expect(onScoreUpdate).toHaveBeenCalled();
		expect(mockSocketSend).toHaveBeenCalled();
	});
});

