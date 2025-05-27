import type { GameplayNote } from '../../types';
import { getNoteYPosition } from '../utils/positionUtils';
import * as PIXI from 'pixi.js';

export interface NoteRenderConfig {
	laneWidth: number;
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
		this.sprite.clear(); // Clear any previous drawing


		const noteColor = this.config.laneColors[this.noteData.lane] || 0xffffff;

		const padding = 4;
		const noteWidth = this.config.laneWidth * this.config.noteWidthRatio - padding * 2;
		const noteHeight = 50;


		// Calculate corner radius for rounded notes
		const cornerRadius = Math.min(12, noteWidth / 6, noteHeight / 3);

		// In PixiJS v8, build the shape first, then fill it
		this.sprite
			.roundRect(0, 0, noteWidth, noteHeight, cornerRadius)
			.fill({
				color: noteColor,
				alpha: 0.9
			});

		// Add a subtle border for better visibility
		this.sprite
			.roundRect(0, 0, noteWidth, noteHeight, cornerRadius)
			.stroke({
				width: 1,
				color: 0xffffff,
				alpha: 0.3
			});
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
			this.noteData.timeMs,  // noteTime - when the note should be hit
			songTimeMs,            // currentTime - current song position
			receptorYPosition,
			scrollSpeed,
			canvasHeight
		);

		const laneCenterX = highwayX + (this.noteData.lane + 0.5) * this.config.laneWidth;
		const noteWidth = this.config.laneWidth * this.config.noteWidthRatio;

		this.sprite.x = laneCenterX - (noteWidth / 2);
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