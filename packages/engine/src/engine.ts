import type { ChartHitObject } from './types';
import { DEFAULT_CONFIG, SCORING, getJudgment } from './rules';
import type { EngineNote, GameConfig, GameEvent, GameState, Judgment } from './types';

export class RhythmEngine {
	public state: GameState;
	public config: GameConfig;

	private upcomingIndex = 0;

	constructor(chart: ChartHitObject[], config?: Partial<GameConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		const notes: EngineNote[] = [...chart]
			.sort((a, b) => a.time - b.time)
			.map((n, idx) => ({
				...n,
				id: n.id ?? idx,
				isHit: false,
				isMissed: false,
				isHolding: false,
				holdSatisfied: false,
				holdBroken: false
			}));

		this.state = {
			score: 0,
			combo: 0,
			maxCombo: 0,
			notes
		};
	}

	update(timeMs: number): GameEvent[] {
		const events: GameEvent[] = [];
		const missWindow = this.config.timingWindows.meh;

		while (this.upcomingIndex < this.state.notes.length) {
			const note = this.state.notes[this.upcomingIndex];
			if (note.time > timeMs + missWindow) break;

			if (!note.isHit && !note.isMissed && !note.isHolding) {
				if (timeMs > note.time + missWindow) {
					this.applyMiss(note, events);
					this.upcomingIndex++;
					continue;
				}
			}

			if (note.isHit || note.isMissed) {
				this.upcomingIndex++;
				continue;
			}
			break;
		}

		// Hold completion/timeout
		for (const note of this.state.notes) {
			if (note.note_type !== 'hold') continue;

			const endTime = note.time + (note.duration ?? 0);
			if (note.isHolding && timeMs > endTime + missWindow) {
				this.breakHold(note, events);
			} else if (!note.isHit && !note.isMissed && timeMs > endTime + missWindow) {
				this.applyMiss(note, events);
			}
		}

		return events;
	}

	submitInput(lane: number, timeMs: number): GameEvent | null {
		const missWindow = this.config.timingWindows.meh;

		for (let i = this.upcomingIndex; i < this.state.notes.length; i++) {
			const note = this.state.notes[i];
			if (note.lane !== lane) continue;
			if (note.isHit || note.isMissed) continue;
			if (note.time > timeMs + missWindow) break;

			const diff = note.time - timeMs;
			const judgment = getJudgment(diff, this.config);
			if (judgment === 'IGNORE') continue;
			if (judgment === 'MISS') {
				// too late, let update handle miss
				continue;
			}

			return this.applyHit(note, judgment);
		}

		return null;
	}

	releaseInput(lane: number, timeMs: number): GameEvent | null {
		const note = this.state.notes.find(
			(n) => n.lane === lane && n.note_type === 'hold' && n.isHolding && !n.holdSatisfied
		);
		if (!note) return null;

		note.isHolding = false;
		const endTime = note.time + (note.duration ?? 0);
		const diff = endTime - timeMs;
		const judgment = getJudgment(diff, this.config);

		if (judgment === 'IGNORE' || judgment === 'MISS') {
			return this.breakHold(note, []);
		}

		note.holdSatisfied = true;
		note.isHit = true;
		const score = SCORING.holdRelease[judgment];
		this.addScore(score);

		return {
			type: 'hit',
			noteId: note.id,
			judgment,
			scoreDelta: score,
			lane: note.lane
		};
	}

	private applyHit(note: EngineNote, judgment: Judgment): GameEvent {
		note.isHit = true;
		note.isMissed = false;
		if (note.note_type === 'hold') note.isHolding = true;

		const score = SCORING.tap[judgment];
		this.addScore(score);

		return {
			type: 'hit',
			noteId: note.id,
			judgment,
			scoreDelta: score,
			lane: note.lane
		};
	}

	private applyMiss(note: EngineNote, events: GameEvent[]) {
		if (note.isMissed) return;
		note.isMissed = true;
		note.isHit = false;
		note.isHolding = false;
		this.state.combo = 0;
		events.push({ type: 'miss', noteId: note.id, lane: note.lane });
	}

	private breakHold(note: EngineNote, events: GameEvent[]): GameEvent {
		note.holdBroken = true;
		note.isMissed = true;
		note.isHolding = false;
		this.state.combo = 0;
		const event: GameEvent = {
			type: 'hold_broken',
			noteId: note.id,
			lane: note.lane
		};
		events.push(event);
		return event;
	}

	private addScore(amount: number) {
		this.state.score += amount;
		this.state.combo += 1;
		if (this.state.combo > this.state.maxCombo) this.state.maxCombo = this.state.combo;
	}
}
