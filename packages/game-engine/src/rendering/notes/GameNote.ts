import type { GameplayNote } from '../../types';
import { getNoteYPosition } from '../utils/positionUtils';
import * as PIXI from 'pixi.js';

export interface NoteRenderConfig {
	canvasWidth: number;
	noteWidthRatio: number;
	laneColors: number[];
	// Add other rendering-specific config as needed
}

export class GameNote {
	public sprite: PIXI.Graphics;
	public noteData: GameplayNote;
	public id: number;
	protected config: NoteRenderConfig;

	constructor(noteData: GameplayNote, id: number, config: NoteRenderConfig) {
		this.noteData = noteData;
		this.id = id;
		this.config = config;
		this.sprite = new PIXI.Graphics();
		this.draw();
	}

	private draw(): void {
		const noteColor = this.config.laneColors[this.noteData.lane] || 0xffffff;
		// this.sprite.beginFill(noteColor);
		// this.sprite.drawRect(0, 0, this.config.canvasWidth * this.config.noteWidthRatio, 10);
		// this.sprite.endFill();


		// (method) Graphics.drawRect(x: number, y: number, w: number, h: number): PIXI.Graphics
		// @deprecated — since 8.0.0 Use Graphics#rect instead



		this.sprite.fill({
			color: noteColor,
		})
		this.sprite.rect(0, 0, this.config.canvasWidth * this.config.noteWidthRatio, 10);
	}

	addToStage(stage: PIXI.Container) {
		if (!this.sprite.parent) {
			stage.addChild(this.sprite);
		}
	}

	removeFromStage() {
		if (this.sprite.parent) {
			this.sprite.parent.removeChild(this.sprite);
		}
	}

	show() {
		this.sprite.visible = true;
	}

	hide() {
		this.sprite.visible = false;
	}

	updatePosition(songTimeMs: number, _hitZoneY: number, receptorYPosition: number, scrollSpeed: number, canvasHeight: number, highwayX: number) {
		const idealHeadY = getNoteYPosition(
			songTimeMs,
			this.noteData.timeMs,
			receptorYPosition,
			scrollSpeed,
			canvasHeight
		);

		const laneWidth = (this.config.canvasWidth / (this.config.laneColors.length || 4));
		const laneCenterX = highwayX + (this.noteData.lane + 0.5) * laneWidth;

		this.sprite.x = laneCenterX - (this.config.canvasWidth * this.config.noteWidthRatio / 2);
		this.sprite.y = idealHeadY;
	}

	onResize(highwayX: number, songTimeMs: number, hitZoneY: number, receptorYPosition: number, scrollSpeed: number, canvasHeight: number) {
		this.draw();
		this.updatePosition(songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight, highwayX);
	}

	reset(noteData: GameplayNote, id: number, config: NoteRenderConfig) {
		this.noteData = noteData;
		this.id = id;
		this.config = config;
		this.draw();
		this.hide();
	}
} 