import * as PIXI from 'pixi.js';
import type { GameplayNote } from '../../types';
import type { NoteRenderConfig, NoteComponent } from '../notes/NoteComponent';
import { atom, effect, type ReadableAtom } from 'nanostores';
import { HoldNoteComponent, TapNoteComponent } from '../notes';

export interface NoteRendererConfig extends NoteRenderConfig { // Extends the one from notes
	// Add any additional config specific to the overall NoteRenderer here if needed
	// For now, it primarily uses the NoteRenderConfig for the pool.
	hitZoneY: number; // Y position of the hit zone/receptors line
	receptorYPosition: number; // Exact Y where notes are considered "at" the receptor (might be same as hitZoneY or slightly different)
	scrollSpeed: number;
	canvasHeight: number; // Total height of the canvas for offscreen checks
	highwayX: number; // Starting X of the highway area for positioning notes within lanes
}

// TODO: Fix this class!!!!
export class NoteRenderer extends PIXI.Container {
	private activeNotes: Map<number, NoteComponent> = new Map();

	numLanes = atom(4);
	laneWidth = atom(0);
	noteWidthRatio = atom(1);
	laneColors = atom<number[]>([]);
	highwayX = atom(0);
	hitZoneY = atom(0);
	receptorYPosition = atom(0);
	scrollSpeed = atom(1);
	canvasHeight = atom(0);

	constructor(protected receptorPositions: ReadableAtom<{
		x: number;
		y: number;
	}[]>) {


		super();
		const virtualScreenHeight = 768;

		const g = new PIXI.Graphics()
		this.addChild(g);
		effect([this.receptorPositions], (receptorPositions) => {

			g.clear();
			const mag = Math.max(...receptorPositions.map(pos => pos.x)) - Math.min(...receptorPositions.map(pos => pos.x));
	
			g.clear();
			g.rect(0, 0, mag, virtualScreenHeight);
			g.fill({
				color: 0x00aa00,
				alpha: 0.2
			});
		});

		


		

		this.label = "NoteRenderer";
	}


	private tapNotePool: TapNoteComponent[] = [];
	private holdNotePool: HoldNoteComponent[] = [];
	
	private _getNote(noteData: GameplayNote, id: number): NoteComponent {
		if (noteData.noteInfo.type === 'hold') {
			let note = this.holdNotePool.find(n => !n.visible);
			if (note) {
				note.reset(noteData, id);
			} else {
				note = new HoldNoteComponent(noteData, id);
				this.holdNotePool.push(note);
			}
			this.addChild(note)
			return note;
		} else {
			let note = this.tapNotePool.find(n => !n.visible);
			if (note) {
				note.reset(noteData, id);
			} else {
				note = new TapNoteComponent(noteData, id);
				this.tapNotePool.push(note);
			}
			this.addChild(note)
			return note;
		}
	}

	 private _releaseNote(note: NoteComponent): void {
		note.visible = false;
	}

	public addNote(noteData: GameplayNote): void {
		const note = this._getNote(noteData, noteData.id);

		note.visible = true;
		// Initial position update
		note.updatePosition(
			0, // Assuming songTimeMs is 0 at the point of adding, or pass current game time
			this.hitZoneY.get(),
			this.receptorYPosition.get(),
			this.scrollSpeed.get(),
			this.canvasHeight.get(),
			this.highwayX.get()
		);
		this.activeNotes.set(noteData.id, note);
		this.addChild(note);
	}

	public removeNote(noteId: number): void {
		const note = this.activeNotes.get(noteId);
		if (note) {
			this._releaseNote(note);
			this.activeNotes.delete(noteId);
		}
	}

	public updateNotes(songTimeMs: number): void {
		for (const [_id, note] of this.activeNotes) {
			const posInfo = this.receptorPositions.get()[note.noteData.lane];
			note.updatePosition(
				songTimeMs,
				this.hitZoneY.get(),
				this.receptorYPosition.get(),
				this.scrollSpeed.get(),
				this.canvasHeight.get(),
				this.highwayX.get()
			);
		}
	}

	public updateConfig({
		laneWidth,
		noteWidthRatio,
		laneColors,
		highwayX,
		hitZoneY,
		receptorYPosition,
		scrollSpeed,
		canvasHeight
	}: {
		
		laneWidth: number,
		noteWidthRatio: number,
		laneColors: number[],
		highwayX: number,
		hitZoneY: number,
		receptorYPosition: number,
		scrollSpeed: number,
		canvasHeight: number
	}) {
		this.laneWidth.set(laneWidth);
		this.noteWidthRatio.set(noteWidthRatio);
		this.laneColors.set(laneColors);
		this.highwayX.set(highwayX);
		this.hitZoneY.set(hitZoneY);
		this.receptorYPosition.set(receptorYPosition);
		this.scrollSpeed.set(scrollSpeed);
		this.canvasHeight.set(canvasHeight);

		// todo: fix this
		const songTimeMs = 0;

		this.tapNotePool.forEach(note => {
			if (note.visible) {
				note.updatePosition(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
			}
		});
		this.holdNotePool.forEach(note => {
			if (note.visible) {
				note.updatePosition(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
			}
		});

	}

	public destroy(): void {
		super.destroy({ children: true, texture: true });

		this.tapNotePool.forEach(note => note.destroy());
		this.holdNotePool.forEach(note => note.destroy());
		this.tapNotePool = [];
		this.holdNotePool = [];

		this.activeNotes.clear();
	}
} 