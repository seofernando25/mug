import { describe, expect, it, beforeEach } from 'bun:test';
import { RhythmEngine } from './engine';

const chart = [
	{ id: 1, time: 1000, lane: 0, note_type: 'tap' as const, duration: null, chartId: 'test-chart' },
	{ id: 2, time: 2000, lane: 1, note_type: 'tap' as const, duration: null, chartId: 'test-chart' }
];

describe('RhythmEngine', () => {
	let engine: RhythmEngine;

	beforeEach(() => {
		engine = new RhythmEngine(chart);
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

