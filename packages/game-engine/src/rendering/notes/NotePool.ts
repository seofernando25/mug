import type { GameplayNote } from '../../types';
import { GameNote, type NoteRenderConfig } from './GameNote';
import { HoldNote } from './HoldNote';
import type * as PIXI from 'pixi.js';

export class NotePool {
	private tapNotePool: GameNote[] = [];
	private holdNotePool: HoldNote[] = [];
	private stage: PIXI.Container;
	private noteRenderConfig: NoteRenderConfig;

	constructor(stage: PIXI.Container, noteRenderConfig: NoteRenderConfig, initialPoolSize: number = 30) {
		this.stage = stage;
		this.noteRenderConfig = noteRenderConfig;
		this._prepopulatePools(initialPoolSize);
	}

	private _prepopulatePools(poolSize: number): void {
		for (let i = 0; i < poolSize; i++) {
			const dummyTapData: GameplayNote = {
				id: - (i + 1), // Ensure unique negative IDs for dummies
				timeMs: 0,
				lane: 0,
				noteInfo: { type: 'tap' },
				noteState: { noteType: 'tap', state: { type: 'waiting' } }
			};
			this.tapNotePool.push(new GameNote(dummyTapData, dummyTapData.id, this.noteRenderConfig));

			const dummyHoldData: GameplayNote = {
				id: - (poolSize + i + 1), // Ensure unique negative IDs for dummies
				timeMs: 0,
				lane: 0,
				noteInfo: { type: 'hold', durationMs: 100 },
				noteState: { noteType: 'hold', state: { type: 'waiting' } }
			};
			this.holdNotePool.push(new HoldNote(dummyHoldData, dummyHoldData.id, this.noteRenderConfig));
		}
	}

	getNote(noteData: GameplayNote, id: number): GameNote {
		if (noteData.noteInfo.type === 'hold') {
			let note = this.holdNotePool.find(n => !n.sprite.visible);
			if (note) {
				note.reset(noteData, id, this.noteRenderConfig);
			} else {
				note = new HoldNote(noteData, id, this.noteRenderConfig);
				this.holdNotePool.push(note);
			}
			note.addToStage(this.stage);
			return note;
		} else {
			let note = this.tapNotePool.find(n => !n.sprite.visible);
			if (note) {
				note.reset(noteData, id, this.noteRenderConfig);
			} else {
				note = new GameNote(noteData, id, this.noteRenderConfig);
				this.tapNotePool.push(note);
			}
			note.addToStage(this.stage);
			return note;
		}
	}

	releaseNote(note: GameNote): void {
		note.hide();
	}

	updateNoteRenderConfig(newConfig: Partial<NoteRenderConfig>): void {
		this.noteRenderConfig = { ...this.noteRenderConfig, ...newConfig };
		// Ensure canvasWidth is updated if present in newConfig
		if (newConfig.canvasWidth !== undefined) {
			this.noteRenderConfig.canvasWidth = newConfig.canvasWidth;
		}

		// Update config for all pooled notes so they use new config when reset
		this.tapNotePool.forEach(note => {
			// GameNote's reset method will now handle applying the new config when it's reused
			if (note.sprite.visible) {
				// note.onResize(... pass relevant parameters from your main rendering loop ...);
			}
		});
		this.holdNotePool.forEach(note => {
			if (note.sprite.visible) {
				// note.onResize(... pass relevant parameters from your main rendering loop ...);
			}
		});
	}

	updateActiveNotesLayout(highwayX: number, songTimeMs: number, hitZoneY: number, receptorYPosition: number, scrollSpeed: number, canvasHeight: number) {
		this.tapNotePool.forEach(note => {
			if (note.sprite.visible) {
				note.onResize(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
			}
		});
		this.holdNotePool.forEach(note => {
			if (note.sprite.visible) {
				note.onResize(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
			}
		});
	}

	clearAll(): void {
		this.tapNotePool.forEach(note => note.removeFromStage());
		this.holdNotePool.forEach(note => note.removeFromStage());
		this.tapNotePool = [];
		this.holdNotePool = [];
	}
} 