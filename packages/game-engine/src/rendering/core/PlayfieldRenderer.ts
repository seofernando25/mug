import type { Atom } from 'nanostores';
import { effect } from 'nanostores';
import * as PIXI from 'pixi.js';
import type { GameplayNote } from '../../types';
import { HighwayRenderer } from './HighwayRenderer';
import { NoteRenderer } from './NoteRenderer';
import { ReceptorRenderer } from './ReceptorRenderer';

export class PlayfieldRenderer extends PIXI.Graphics {
	private highwayRenderer: HighwayRenderer;
	private receptorRenderer: ReceptorRenderer;
	// private noteRenderer = new NoteRenderer();

	constructor(screenWidth: Atom<number>, screenHeight: Atom<number>) {
		super();

		this.rect(0, 0, 1024, 768);
		this.fill({
			color: 0x0000ff,
			alpha: 0.2
		});
		
		// outline.pivot.set(640, 360);
		// this.addChild(outline);

		// this.height = screenHeight.get();
		// this.width = 1024;
		this.highwayRenderer = new HighwayRenderer();
		
		this.receptorRenderer = new ReceptorRenderer();

		this.label = "PlayfieldRenderer";

		const cleanup: (() => void)[] = [];
		this.addChild(this.highwayRenderer);
		this.addChild(this.receptorRenderer);

		// this.addChild(this.noteRenderer);
	}



	public addNote(noteData: GameplayNote): void {
		// this.noteRenderer.addNote(noteData);
	}

	public removeNote(noteId: number): void {
		// this.noteRenderer.removeNote(noteId);
	}

	public updateNotes(songTimeMs: number): void {
		// this.noteRenderer.updateNotes(songTimeMs);
	}


	public destroy(): void {
		super.destroy({ children: true, texture: true });
		// this.highwayRenderer.destroy();
		// this.receptorRenderer.destroy();
		// this.noteRenderer.destroy();
	}
} 