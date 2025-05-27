import type { GameplayNote } from '../../types';
import { NoteComponent, type NoteRenderConfig } from './NoteComponent';
import { TapNoteComponent } from './TapNoteComponent';
import { HoldNoteComponent } from './HoldNoteComponent';
import type * as PIXI from 'pixi.js';

export class NotePool {
	private tapNotePool: TapNoteComponent[] = [];
	private holdNotePool: HoldNoteComponent[] = [];
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
			this.tapNotePool.push(new TapNoteComponent(dummyTapData, dummyTapData.id, this.noteRenderConfig));

			const dummyHoldData: GameplayNote = {
				id: - (poolSize + i + 1), // Ensure unique negative IDs for dummies
				timeMs: 0,
				lane: 0,
				noteInfo: { type: 'hold', durationMs: 100 },
				noteState: { noteType: 'hold', state: { type: 'waiting' } }
			};
			this.holdNotePool.push(new HoldNoteComponent(dummyHoldData, dummyHoldData.id, this.noteRenderConfig));
		}
	}

	getNote(noteData: GameplayNote, id: number): NoteComponent {
		if (noteData.noteInfo.type === 'hold') {
			let note = this.holdNotePool.find(n => !n.container.visible);
			if (note) {
				note.reset(noteData, id, this.noteRenderConfig);
			} else {
				note = new HoldNoteComponent(noteData, id, this.noteRenderConfig);
				this.holdNotePool.push(note);
			}
			note.addToStage(this.stage);
			return note;
		} else {
			let note = this.tapNotePool.find(n => !n.container.visible);
			if (note) {
				note.reset(noteData, id, this.noteRenderConfig);
			} else {
				note = new TapNoteComponent(noteData, id, this.noteRenderConfig);
				this.tapNotePool.push(note);
			}
			note.addToStage(this.stage);
			return note;
		}
	}

	releaseNote(note: NoteComponent): void {
		note.hide();
	}

	updateNoteRenderConfig(newConfig: Partial<NoteRenderConfig>): void {
		this.noteRenderConfig = { ...this.noteRenderConfig, ...newConfig };

		// Update config for all pooled notes so they use new config when reset
		this.tapNotePool.forEach(note => {
			// Component's reset method will now handle applying the new config when it's reused
			if (note.container.visible) {
				// note.onResize(... pass relevant parameters from your main rendering loop ...);
			}
		});
		this.holdNotePool.forEach(note => {
			if (note.container.visible) {
				// note.onResize(... pass relevant parameters from your main rendering loop ...);
			}
		});
	}

	updateActiveNotesLayout(highwayX: number, songTimeMs: number, hitZoneY: number, receptorYPosition: number, scrollSpeed: number, canvasHeight: number) {
		this.tapNotePool.forEach(note => {
			if (note.container.visible) {
				note.onResize(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
			}
		});
		this.holdNotePool.forEach(note => {
			if (note.container.visible) {
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