import type { Atom } from 'nanostores';
import { effect } from 'nanostores';
import * as PIXI from 'pixi.js';
import type { GameplayNote } from '../../types';
import { HighwayRenderer } from './HighwayRenderer';
import { NoteRenderer } from './NoteRenderer';
import { ReceptorRenderer } from './ReceptorRenderer';

export class PlayfieldRenderer extends PIXI.Container {
	private highwayRenderer: HighwayRenderer;
	private receptorRenderer: ReceptorRenderer;
	private noteRenderer = new NoteRenderer();

	constructor(screenWidth: Atom<number>, screenHeight: Atom<number>) {
		super();
		this.highwayRenderer = new HighwayRenderer(screenHeight);
		this.receptorRenderer = new ReceptorRenderer(screenHeight);

		this.label = "PlayfieldRenderer";

		const cleanup: (() => void)[] = [];

		cleanup.push(effect([screenWidth, screenHeight], (w, h) => {
			this.pivot.set(-w / 2, -h / 2);			
		}));

		this.addChild(this.highwayRenderer);
		this.addChild(this.receptorRenderer);
		this.addChild(this.noteRenderer);
	}



	public addNote(noteData: GameplayNote): void {
		this.noteRenderer.addNote(noteData);
	}

	public removeNote(noteId: number): void {
		this.noteRenderer.removeNote(noteId);
	}

	public updateNotes(songTimeMs: number): void {
		this.noteRenderer.updateNotes(songTimeMs);
	}


	public destroy(): void {
		super.destroy({ children: true, texture: true });
		this.highwayRenderer.destroy();
		this.receptorRenderer.destroy();
		this.noteRenderer.destroy();
	}
} 