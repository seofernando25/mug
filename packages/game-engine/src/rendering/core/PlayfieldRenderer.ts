import * as PIXI from 'pixi.js';
import type { GameplayNote } from '../../types';
import { HighwayRenderer, type HighwayConfig } from './HighwayRenderer';
import { ReceptorRenderer, type ReceptorConfig } from './ReceptorRenderer';
import { NoteRenderer, type NoteRendererConfig } from './NoteRenderer';

export interface PlayfieldRendererConfig {
	numLanes: number;
	highway: Omit<HighwayConfig, 'numLanes'>; // numLanes will be provided from top level
	receptors: Omit<ReceptorConfig, 'numLanes'>; // numLanes will be provided from top level
	notes: NoteRendererConfig; // NoteRendererConfig already includes numLanes implicitly via laneColors/noteWidthRatio etc.
	// Position of the playfield container itself
	x?: number;
	y?: number;
	scale?: number;
}

export class PlayfieldRenderer {
	public container: PIXI.Container;
	private highwayRenderer: HighwayRenderer;
	private receptorRenderer: ReceptorRenderer;
	private noteRenderer: NoteRenderer; // NoteRenderer takes the stage in its constructor



	constructor(stage: PIXI.Container, initialConfig: PlayfieldRendererConfig) {
		this.container = new PIXI.Container();
		this.container.label = "PlayfieldRenderer";

		// Set pivot to center so positioning works from center instead of top-left
		const playfieldWidth = initialConfig.highway.highwayWidth;
		const playfieldHeight = initialConfig.highway.highwayHeight;
		this.container.pivot.set(playfieldWidth / 2, playfieldHeight / 2);

		if (initialConfig.x) this.container.x = initialConfig.x;
		if (initialConfig.y) this.container.y = initialConfig.y;
		if (initialConfig.scale) this.container.scale.set(initialConfig.scale);
		stage.addChild(this.container);

		this.highwayRenderer = new HighwayRenderer();
		this.receptorRenderer = new ReceptorRenderer();
		// NoteRenderer's container is added to the stage directly by its constructor,
		// but for organizational purposes, we create its own container and add it to the playfield container.
		// We need to adjust NoteRenderer to accept a parent container instead of the main stage.
		const noteContainer = new PIXI.Container();
		this.container.addChild(noteContainer);
		this.noteRenderer = new NoteRenderer(noteContainer, initialConfig.notes);


		this.container.addChild(this.highwayRenderer.container);
		this.container.addChild(this.receptorRenderer.container);
		// Note: NoteRenderer adds its container to the stage passed to it.
		// If we want it nested, NoteRenderer needs to be adapted or we manage its container here.
		// For now, let's assume NoteRenderer is adapted to take a parent container.
		// (Self-correction: NoteRenderer was already adapted to take a container)

		this.draw(initialConfig);
	}

	public draw(config: PlayfieldRendererConfig): void {
		// Update pivot to center for proper positioning
		const playfieldWidth = config.highway.highwayWidth;
		const playfieldHeight = config.highway.highwayHeight;
		this.container.pivot.set(playfieldWidth / 2, playfieldHeight / 2);

		if (config.x !== undefined) this.container.x = config.x;
		if (config.y !== undefined) this.container.y = config.y;
		if (config.scale !== undefined) this.container.scale.set(config.scale);

		const fullHighwayConfig: HighwayConfig = {
			...config.highway,
			numLanes: config.numLanes,
		};
		this.highwayRenderer.draw(fullHighwayConfig);

		const fullReceptorConfig: ReceptorConfig = {
			...config.receptors,
			numLanes: config.numLanes,
			// Ensure receptor laneWidth matches highway's derived laneWidth if not explicitly set
			laneWidth: config.receptors.laneWidth || fullHighwayConfig.laneWidth,
		};
		this.receptorRenderer.draw(fullReceptorConfig);

		// NoteRenderer's draw is typically its constructor + updates.
		// We might need an explicit draw/redraw if its internal structure needs full refresh based on new config.
		// For now, its initial setup in constructor and onResize handles its drawing.
		// If NoteRendererConfig changes significantly, it might need a more direct "redraw"
		this.noteRenderer.onResize(config.notes); // Ensure note renderer is updated with the latest config
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

	public activateReceptor(lane: number): void {
		this.receptorRenderer.activateReceptor(lane);
	}

	public deactivateReceptor(lane: number): void {
		this.receptorRenderer.deactivateReceptor(lane);
	}

	public onResize(newConfig: PlayfieldRendererConfig): void {
		// Update own container properties
		// Update pivot to center for proper positioning
		const playfieldWidth = newConfig.highway.highwayWidth;
		const playfieldHeight = newConfig.highway.highwayHeight;
		this.container.pivot.set(playfieldWidth / 2, playfieldHeight / 2);

		if (newConfig.x !== undefined) this.container.x = newConfig.x;
		if (newConfig.y !== undefined) this.container.y = newConfig.y;
		if (newConfig.scale !== undefined) this.container.scale.set(newConfig.scale);

		const fullHighwayConfig: HighwayConfig = {
			...newConfig.highway,
			numLanes: newConfig.numLanes,
		};
		this.highwayRenderer.onResize(fullHighwayConfig);

		const fullReceptorConfig: ReceptorConfig = {
			...newConfig.receptors,
			numLanes: newConfig.numLanes,
			laneWidth: newConfig.receptors.laneWidth || fullHighwayConfig.laneWidth,
		};
		this.receptorRenderer.onResize(fullReceptorConfig);

		this.noteRenderer.onResize(newConfig.notes);
	}

	public setVisibility(visible: boolean): void {
		this.container.visible = visible;
	}

	public destroy(): void {
		this.highwayRenderer.destroy();
		this.receptorRenderer.destroy();
		this.noteRenderer.destroy();
		this.container.destroy({ children: true, texture: true });
	}
} 