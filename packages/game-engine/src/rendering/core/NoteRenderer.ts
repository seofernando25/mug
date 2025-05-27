import * as PIXI from 'pixi.js';
import type { GameplayNote } from '../../types';
import { NotePool } from '../notes/NotePool';
import type { NoteRenderConfig, NoteComponent } from '../notes/NoteComponent';

export interface NoteRendererConfig extends NoteRenderConfig { // Extends the one from notes
	// Add any additional config specific to the overall NoteRenderer here if needed
	// For now, it primarily uses the NoteRenderConfig for the pool.
	hitZoneY: number; // Y position of the hit zone/receptors line
	receptorYPosition: number; // Exact Y where notes are considered "at" the receptor (might be same as hitZoneY or slightly different)
	scrollSpeed: number;
	canvasHeight: number; // Total height of the canvas for offscreen checks
	highwayX: number; // Starting X of the highway area for positioning notes within lanes
}

export class NoteRenderer {
	public container: PIXI.Container;
	private notePool: NotePool;
	private activeNotes: Map<number, NoteComponent> = new Map();
	private config: NoteRendererConfig;

	constructor(stage: PIXI.Container, initialConfig: NoteRendererConfig) {
		this.container = new PIXI.Container();
		this.container.label = "NoteRenderer";
		this.config = initialConfig;
		// Pass the NoteRenderConfig part of initialConfig to NotePool
		this.notePool = new NotePool(this.container, {
			laneWidth: initialConfig.laneWidth,
			noteWidthRatio: initialConfig.noteWidthRatio,
			laneColors: initialConfig.laneColors,
		});
		stage.addChild(this.container);
	}

	public addNote(noteData: GameplayNote): void {
		if (!this.config) return;
		const note = this.notePool.getNote(noteData, noteData.id);

		note.show();
		// Initial position update
		note.updatePosition(
			0, // Assuming songTimeMs is 0 at the point of adding, or pass current game time
			this.config.hitZoneY,
			this.config.receptorYPosition,
			this.config.scrollSpeed,
			this.config.canvasHeight,
			this.config.highwayX
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
		if (!this.config) return;
		for (const [_id, note] of this.activeNotes) {
			note.updatePosition(
				songTimeMs,
				this.config.hitZoneY,
				this.config.receptorYPosition,
				this.config.scrollSpeed,
				this.config.canvasHeight,
				this.config.highwayX
			);
		}
	}

	public onResize(newConfig: NoteRendererConfig): void {
		this.config = newConfig;
		// Pass the NoteRenderConfig part of newConfig to NotePool
		this.notePool.updateNoteRenderConfig({
			laneWidth: newConfig.laneWidth,
			noteWidthRatio: newConfig.noteWidthRatio,
			laneColors: newConfig.laneColors,
		});
		// Also tell the pool to update any active notes based on new highway/layout params
		this.notePool.updateActiveNotesLayout(
			newConfig.highwayX,
			0, // Ideally, pass current songTimeMs here if available during resize
			newConfig.hitZoneY,
			newConfig.receptorYPosition,
			newConfig.scrollSpeed,
			newConfig.canvasHeight
		);
	}

	public setVisibility(visible: boolean): void {
		this.container.visible = visible;
	}

	public destroy(): void {
		this.notePool.clearAll();
		this.container.destroy({ children: true, texture: true });
		this.activeNotes.clear();
	}
} 