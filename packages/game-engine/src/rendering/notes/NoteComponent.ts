import { atom } from 'nanostores';
import type { GameplayNote } from '../../types';
import { Container } from 'pixi.js';

export interface NoteRenderConfig {
	laneWidth: number;
	noteWidthRatio: number;
	laneColors: number[];
}

export abstract class NoteComponent extends Container {
	public noteData: GameplayNote;
	public id: number;

	constructor(noteData: GameplayNote, id: number) {
		super();
		this.noteData = noteData;
		this.id = id;
		this.label = `Note-${noteData.noteInfo.type}-${id}`;
	}

	public removeFromStage(): void {
		this.parent?.removeChild(this);
	}

	public abstract updatePosition(
		songTimeMs: number,
		hitZoneY: number,
		receptorYPosition: number,
		scrollSpeed: number,
		canvasHeight: number,
		highwayX: number
	): void;

	public reset(noteData: GameplayNote, id: number): void {
		this.noteData = noteData;
		this.id = id;
		this.label = `Note-${noteData.noteInfo.type}-${id}`;
		this.visible = false;
	}

	public destroy(): void {
		super.destroy({ children: true, texture: true });
	}
} 