import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

// Remove the static import since we use dynamic import after mocks are set up
import type { RhythmEngine } from './engine.js';

// Register mocks for this suite only, and restore after.
function installEngineMocks() {
	// These mocks prevent any external dependencies from affecting the engine
	mock.module('$app/environment', () => ({}));
	mock.module('svelte/store', () => ({}));
	mock.module('@pixi/sound', () => ({
		Sound: {
			from: mock(() => ({
				duration: 100,
				isLoaded: true,
				destroy: mock(),
				play: mock(),
				stop: mock(),
				volume: 1
			}))
		}
	}));
	mock.module('$lib/preferences', () => ({}));
}

const chart = [
	{
		id: 1,
		time: 1000,
		lane: 0,
		note_type: 'tap' as const,
		duration: null,
		chartId: 'test-chart'
	},
	{
		id: 2,
		time: 2000,
		lane: 1,
		note_type: 'tap' as const,
		duration: null,
		chartId: 'test-chart'
	}
];

describe('RhythmEngine', () => {
	let engine: RhythmEngine;
	let RhythmEngineClass: typeof RhythmEngine;

	beforeAll(async () => {
		installEngineMocks();
		// Import after mocks are registered so dependencies resolve to mocks only within this suite.
		const { RhythmEngine } = await import('./engine.js');
		RhythmEngineClass = RhythmEngine;
	});

	afterAll(() => {
		// Restore the original modules so mocks don't leak to other suites.
		mock.restore();
	});

	beforeEach(() => {
		// Create fresh engine for each test
		engine = new RhythmEngineClass(chart);
	});

	it('hits a perfect note and increments combo/score', () => {
		const res = engine.submitInput(0, 1000);
		expect(res?.judgment).toBe('PERFECT');
		expect(engine.state.score).toBeGreaterThan(0);
		expect(engine.state.combo).toBe(1);
	});

	it('ignores early ghost taps', () => {
		const res = engine.submitInput(0, 500);
		expect(res).toBeNull();
		expect(engine.state.score).toBe(0);
	});

	it('misses when time advances past window', () => {
		const events = engine.update(1300);
		expect(events.find((e) => e.type === 'miss' && e.noteId === 1)).toBeTruthy();
		expect(engine.state.combo).toBe(0);
	});
});
