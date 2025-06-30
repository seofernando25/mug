import type { Atom } from 'nanostores';
import { atom, effect, map } from 'nanostores';
import * as PIXI from 'pixi.js';
import type { GameplayNote, GameplaySong } from '../../types';
import { highwayRenderer } from './HighwayRenderer';
import { NoteRenderer } from './NoteRenderer';
import { receptorRenderer } from './ReceptorRenderer';

export const playfieldRenderer = (ctx: {
	screenSize: Atom<{ width: number, height: number }>,
	song: Atom<GameplaySong | undefined>,
}) => {


	const container = new PIXI.Container();
	container.label = "PlayfieldRenderer";

	const cleanup: (() => void)[] = [];


	// Add a reference background
	const g = new PIXI.Graphics();
	g.rect(0, 0, 1024, 768);
	g.fill({
		color: 0x0000ff,
		alpha: 0.2
	});
	container.addChild(g);

	const virtualScreenSize = map({
		width: 1024,
		height: 768,
	})

	cleanup.push(effect([ctx.screenSize, virtualScreenSize], (screenSize, virtualScreenSize) => {

		const w = screenSize.width;
		const h = screenSize.height;
		let scale = Math.min(w / virtualScreenSize.width, h / virtualScreenSize.height);

		container.scale.set(scale, scale);
		container.x = (w - virtualScreenSize.width * scale) / 2;
		container.y = (h - virtualScreenSize.height * scale) / 2;
	}));

	// #region Highway Renderer
	const laneSpace = atom(4 * 20);
	const highway = highwayRenderer({
		screenSize: virtualScreenSize,
		numLanes: atom(4),
		fillColor: atom(0x333333),
		fillAlpha: atom(0.2),
		laneSpace: laneSpace,
	})
	container.addChild(highway);
	cleanup.push(() => {
		highway.destroy();
	});
	// #endregion

	// #region Receptor Renderer
	
	const receptorRend = receptorRenderer({
		numLanes: atom(4),
		screenSize: virtualScreenSize,
		laneSpace: laneSpace,
	});
	container.addChild(receptorRend);
	cleanup.push(() => {
		receptorRend.destroy();
	});

	// #endregion

	// #region Note Renderer



	// #endregion
	
	container.on("destroyed", () => {
		cleanup.forEach(cleanup => cleanup());
	});

	return container;
}

export class PlayfieldRenderer extends PIXI.Container {
	private receptorRenderer: ReceptorRenderer;
	private noteRenderer: NoteRenderer;

	constructor() {
		super();

		const g = new PIXI.Graphics()
		g.rect(0, 0, 1024, 768);
		g.fill({
			color: 0x0000ff,
			alpha: 0.2
		});
		this.addChild(g);
		
		this.highwayRenderer = new HighwayRenderer();
		
		this.receptorRenderer = new ReceptorRenderer();
		this.noteRenderer = new NoteRenderer(this.receptorRenderer.receptorPositions);

		const minX = Math.min(...this.receptorRenderer.receptorPositions.get().map(pos => pos.x));

		this.noteRenderer.x = minX;

		this.label = "PlayfieldRenderer";

		const cleanup: (() => void)[] = [];
		this.addChild(this.highwayRenderer);
		this.addChild(this.receptorRenderer);
		this.addChild(this.noteRenderer);
	}



	public addNote(noteData: GameplayNote): void {
		console.log("addNote", noteData);
		this.noteRenderer.addNote(noteData);
	}

	public removeNote(noteId: number): void {
		this.noteRenderer.removeNote(noteId);
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