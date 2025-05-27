import type { GameplayNote } from '../../types';
import * as PIXI from 'pixi.js';

export interface NoteRenderConfig {
	laneWidth: number;
	noteWidthRatio: number;
	laneColors: number[];
}

export abstract class NoteComponent {
	public container: PIXI.Container;
	public noteData: GameplayNote;
	public id: number;
	protected config: NoteRenderConfig;

	constructor(noteData: GameplayNote, id: number, config: NoteRenderConfig) {
		this.noteData = noteData;
		this.id = id;
		this.config = config;
		this.container = new PIXI.Container();
		this.container.label = `Note-${noteData.noteInfo.type}-${id}`;
		// Don't call draw() here - let subclasses handle initialization order
	}

	// Abstract methods that subclasses must implement
	protected abstract draw(): void;

	// Common lifecycle methods
	public addToStage(stage: PIXI.Container): void {
		if (!this.container.parent) {
			stage.addChild(this.container);
		}
	}

	public removeFromStage(): void {
		if (this.container.parent) {
			this.container.parent.removeChild(this.container);
		}
	}

	public show(): void {
		this.container.visible = true;
	}

	public hide(): void {
		this.container.visible = false;
	}

	public abstract updatePosition(
		songTimeMs: number,
		hitZoneY: number,
		receptorYPosition: number,
		scrollSpeed: number,
		canvasHeight: number,
		highwayX: number
	): void;

	public onResize(
		highwayX: number,
		songTimeMs: number,
		hitZoneY: number,
		receptorYPosition: number,
		scrollSpeed: number,
		canvasHeight: number
	): void {
		this.draw();
		this.updatePosition(songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight, highwayX);
	}

	public reset(noteData: GameplayNote, id: number, config: NoteRenderConfig): void {
		this.noteData = noteData;
		this.id = id;
		this.config = config;
		this.container.label = `Note-${noteData.noteInfo.type}-${id}`;
		this.draw();
		this.hide();
	}

	public destroy(): void {
		this.container.destroy({ children: true, texture: true });
	}
} 