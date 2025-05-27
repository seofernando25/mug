import type { GameplayNote } from '../../types';
import * as PIXI from 'pixi.js';
import { NoteComponent, type NoteRenderConfig } from './NoteComponent';
import { getNoteYPosition } from '../utils/positionUtils';

export class TapNoteComponent extends NoteComponent {
	private sprite: PIXI.Graphics;

	constructor(noteData: GameplayNote, id: number, config: NoteRenderConfig) {
		super(noteData, id, config);
		this.sprite = new PIXI.Graphics();
		this.container.addChild(this.sprite);
		this.draw();
	}

	protected draw(): void {
		this.sprite.clear();

		const noteColor = this.config.laneColors[this.noteData.lane] || 0xffffff;
		const padding = 4;
		const noteWidth = this.config.laneWidth * this.config.noteWidthRatio - padding * 2;
		const noteHeight = 50;

		// Calculate corner radius for rounded notes
		const cornerRadius = Math.min(12, noteWidth / 6, noteHeight / 3);

		// Draw the note with rounded corners
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

	public updatePosition(
		songTimeMs: number,
		_hitZoneY: number,
		receptorYPosition: number,
		scrollSpeed: number,
		canvasHeight: number,
		highwayX: number
	): void {
		const idealY = getNoteYPosition(
			this.noteData.timeMs,  // noteTime - when the note should be hit
			songTimeMs,            // currentTime - current song position
			receptorYPosition,
			scrollSpeed,
			canvasHeight
		);

		const laneCenterX = highwayX + (this.noteData.lane + 0.5) * this.config.laneWidth;
		const noteWidth = this.config.laneWidth * this.config.noteWidthRatio;

		// Position the container (which contains the sprite)
		this.container.x = laneCenterX - (noteWidth / 2);
		this.container.y = idealY;
	}

	public destroy(): void {
		this.sprite.destroy();
		super.destroy();
	}
} 