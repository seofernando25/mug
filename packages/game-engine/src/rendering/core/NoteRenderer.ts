import * as PIXI from 'pixi.js';
import type { GameplayNote } from '../../types';
import { NotePool } from '../notes/NotePool';
import type { NoteRenderConfig, NoteComponent } from '../notes/NoteComponent';
import { atom } from 'nanostores';

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
	private notePool = new NotePool(this);
	private activeNotes: Map<number, NoteComponent> = new Map();

	laneWidth = atom(0);
	noteWidthRatio = atom(1);
	laneColors = atom<number[]>([]);
	highwayX = atom(0);
	hitZoneY = atom(0);
	receptorYPosition = atom(0);
	scrollSpeed = atom(1);
	canvasHeight = atom(0);

	constructor() {
		super();
		this.label = "NoteRenderer";
	}

	public addNote(noteData: GameplayNote): void {
		const note = this.notePool.getNote(noteData, noteData.id);
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
	}

	public removeNote(noteId: number): void {
		const note = this.activeNotes.get(noteId);
		if (note) {
			this.notePool.releaseNote(note);
			this.activeNotes.delete(noteId);
		}
	}

	public updateNotes(songTimeMs: number): void {
		for (const [_id, note] of this.activeNotes) {
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

		// Pass the NoteRenderConfig part to NotePool
		this.notePool.updateNoteRenderConfig({
			laneWidth,
			noteWidthRatio,
			laneColors,
		});
		// Also tell the pool to update any active notes based on new highway/layout params
		this.notePool.updateActiveNotesLayout(
			highwayX,
			0, // Ideally, pass current songTimeMs here if available during resize
			hitZoneY,
			receptorYPosition,
			scrollSpeed,
			canvasHeight
		);
	}

	public destroy(): void {
		super.destroy({ children: true, texture: true });
		this.notePool.clearAll();
		this.activeNotes.clear();
	}
} 