import type { ChartHitObject } from '$lib/types';
import { Container } from 'pixi.js';
import { GameNote } from './GameNote';
import { HoldNote } from './HoldNote';

export class NotePool {
	private tapNotePool: GameNote[] = [];
	private holdNotePool: HoldNote[] = [];
	private activeNotes: Map<number, GameNote> = new Map();

	private pixiStage: Container;
	private currentLaneWidth: number;

	constructor(stage: Container, initialLaneWidth: number, initialPoolSize: number = 30) {
		this.pixiStage = stage;
		this.currentLaneWidth = initialLaneWidth;
		this._prepopulatePools(initialPoolSize);
	}

	private _prepopulatePools(size: number) {
		const dummyTapData: ChartHitObject = { id: -1, time: 0, lane: 0, note_type: 'tap', duration: null, chartId: '' };
		const dummyHoldData: ChartHitObject = { id: -1, time: 0, lane: 0, note_type: 'hold', duration: 100, chartId: '' };

		for (let i = 0; i < size; i++) {
			this.tapNotePool.push(new GameNote(dummyTapData, this.currentLaneWidth));
			this.holdNotePool.push(new HoldNote(dummyHoldData, this.currentLaneWidth));
		}
	}

	getNote(noteData: ChartHitObject): GameNote {
		let note: GameNote;

		if (noteData.note_type === 'tap') {
			const pooledNote = this.tapNotePool.pop();
			if (!pooledNote) {
				note = new GameNote(noteData, this.currentLaneWidth);
			} else {
				pooledNote.reset(noteData, this.currentLaneWidth);
				note = pooledNote;
			}
		} else { // 'hold'
			const pooledHoldNote = this.holdNotePool.pop();
			if (!pooledHoldNote) {
				note = new HoldNote(noteData, this.currentLaneWidth);
			} else {
				pooledHoldNote.reset(noteData, this.currentLaneWidth);
				note = pooledHoldNote;
			}
		}

		note.addToStage(this.pixiStage);
		this.activeNotes.set(note.id, note);
		return note;
	}

	releaseNote(note: GameNote) {
		if (!this.activeNotes.has(note.id)) return;

		note.hide();
		note.removeFromStage();
		this.activeNotes.delete(note.id);
		note.isJudged = false;
		note.isActivelyHeld = false;

		if (note instanceof HoldNote) {
			this.holdNotePool.push(note);
		} else {
			this.tapNotePool.push(note);
		}
	}

	getActiveNoteById(id: number): GameNote | undefined {
		return this.activeNotes.get(id);
	}

	getActiveNotes(): IterableIterator<GameNote> {
		return this.activeNotes.values();
	}

	updateGraphicsOnResize(newLaneWidth: number, highwayX: number, songTimeMs: number, hitZoneY: number, receptorYPosition: number, scrollSpeed: number, canvasHeight: number) {
		this.currentLaneWidth = newLaneWidth;
		this.activeNotes.forEach(note => {
			note.onResize(newLaneWidth, highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
		});
		this.tapNotePool.forEach(note => note.laneWidth = newLaneWidth);
		this.holdNotePool.forEach(note => note.laneWidth = newLaneWidth);
	}
} 