import type { GameplayNote } from '../../types';
import * as PIXI from 'pixi.js';
import { NoteComponent, type NoteRenderConfig } from './NoteComponent';
import { getNoteYPosition } from '../utils/positionUtils';

export class HoldNoteComponent extends NoteComponent {
	private headSprite: PIXI.Graphics;
	private bodySprite: PIXI.Graphics;
	private tailSprite: PIXI.Graphics;

	constructor(noteData: GameplayNote, id: number, config: NoteRenderConfig) {
		super(noteData, id, config);

		// Create and add all three sprites to the container
		this.headSprite = new PIXI.Graphics();
		this.headSprite.label = 'head';
		this.bodySprite = new PIXI.Graphics();
		this.bodySprite.label = 'body';
		this.tailSprite = new PIXI.Graphics();
		this.tailSprite.label = 'tail';

		this.container.addChild(this.headSprite);
		this.container.addChild(this.bodySprite);
		this.container.addChild(this.tailSprite);

		this.draw();

		// Initially hide body and tail until updatePosition is called
		this.bodySprite.visible = false;
		this.tailSprite.visible = false;
	}

	protected draw(): void {
		this.drawHead();
		this.drawTail();
		// Body is drawn dynamically in updatePosition
	}

	private drawHead(): void {
		this.headSprite.clear();

		const noteColor = this.config.laneColors[this.noteData.lane] || 0xffffff;
		const padding = 4;
		const noteWidth = this.config.laneWidth * this.config.noteWidthRatio - padding * 2;
		const noteHeight = 50;

		// Calculate corner radius for rounded notes
		const cornerRadius = Math.min(12, noteWidth / 6, noteHeight / 3);

		// Draw the head note (same as tap note)
		this.headSprite
			.roundRect(0, 0, noteWidth, noteHeight, cornerRadius)
			.fill({
				color: noteColor,
				alpha: 0.9
			});

		// Add a subtle border for better visibility
		this.headSprite
			.roundRect(0, 0, noteWidth, noteHeight, cornerRadius)
			.stroke({
				width: 1,
				color: 0xffffff,
				alpha: 0.3
			});
	}

	private drawTail(): void {
		this.tailSprite.clear();

		const noteColor = this.config.laneColors[this.noteData.lane] || 0xffffff;
		const padding = 4;
		const noteWidth = this.config.laneWidth * this.config.noteWidthRatio - padding * 2;
		const tailHeight = 50;

		// Calculate corner radius for rounded notes
		const cornerRadius = Math.min(12, noteWidth / 6, tailHeight / 3);

		// Draw the tail note (same style as head)
		this.tailSprite
			.roundRect(0, 0, noteWidth, tailHeight, cornerRadius)
			.fill({
				color: noteColor,
				alpha: 0.9
			});

		// Add border to tail
		this.tailSprite
			.roundRect(0, 0, noteWidth, tailHeight, cornerRadius)
			.stroke({
				width: 1,
				color: 0xffffff,
				alpha: 0.3
			});
	}

	private drawBody(height: number): void {
		this.bodySprite.clear();

		if (height <= 0) {
			console.warn("HoldNoteComponent: Body height is less than 0");
			return;
		}

		const padding = 4;
		const noteColor = this.config.laneColors[this.noteData.lane] || 0xffffff;
		const bodyWidth = this.config.laneWidth * this.config.noteWidthRatio - padding * 2;

		const cornerRadius = Math.min(12, bodyWidth / 6, bodyWidth / 3);

		// Simple rectangle connecting head to tail
		this.bodySprite
			.roundRect(0, 0, bodyWidth, height, cornerRadius)
			.fill({
				color: noteColor,
				alpha: 0.9
			});

		// Add border to body
	}

	public updatePosition(
		songTimeMs: number,
		hitZoneY: number,
		receptorYPosition: number,
		scrollSpeed: number,
		canvasHeight: number,
		highwayX: number
	): void {
		if (this.noteData.noteInfo.type !== 'hold') return;

		// Calculate head position
		const idealHeadY = getNoteYPosition(
			this.noteData.timeMs,  // noteTime - when the head should be hit
			songTimeMs,            // currentTime - current song position
			receptorYPosition,
			scrollSpeed,
			canvasHeight
		);

		// Calculate tail position
		const tailTimeMs = this.noteData.timeMs + this.noteData.noteInfo.durationMs;
		const idealTailY = getNoteYPosition(
			tailTimeMs,      // noteTime - when the tail should be hit
			songTimeMs,      // currentTime - current song position  
			receptorYPosition,
			scrollSpeed,
			canvasHeight
		);

		// Position the container
		const laneCenterX = highwayX + (this.noteData.lane + 0.5) * this.config.laneWidth;
		const noteWidth = this.config.laneWidth * this.config.noteWidthRatio;
		this.container.x = laneCenterX - (noteWidth / 2);
		this.container.y = idealHeadY;

		// Position head sprite (relative to container)
		this.headSprite.x = 0;
		this.headSprite.y = 0;

		// Position and draw body sprite
		const bodyHeight = Math.max(0, Math.abs(idealTailY - idealHeadY) + 50); // Distance between head and tail minus head height
		this.bodySprite.x = 0; // Center the body
		this.bodySprite.y = -bodyHeight + 50; // Start just below the head
		this.drawBody(bodyHeight);

		// Position tail sprite
		this.tailSprite.x = 0;
		this.tailSprite.y = idealTailY - idealHeadY; // Relative to container

		// Handle note states
		const noteIsActive = this.noteData.noteState.state.type === 'active';
		const noteIsWaiting = this.noteData.noteState.state.type === 'waiting';

		if (noteIsActive) {
			// When active, the head stays at the hit zone, adjust container position
			this.container.y = hitZoneY;

			// Recalculate body and tail positions relative to new container position
			const activeBodyHeight = Math.max(0, Math.abs(idealTailY - idealHeadY) + 50);
			this.bodySprite.y = 50; // Start just below the head
			this.drawBody(activeBodyHeight);
			this.tailSprite.y = idealTailY - hitZoneY; // Relative to new container position

			this.bodySprite.visible = true;
			this.tailSprite.visible = true;
		} else if (noteIsWaiting) {
			// Normal scrolling - show all parts
			this.bodySprite.visible = true;
			this.tailSprite.visible = true;
		} else {
			// Hide body and tail when note is complete
			this.bodySprite.visible = false;
			this.tailSprite.visible = false;
		}
	}

	public destroy(): void {
		this.headSprite.destroy();
		this.bodySprite.destroy();
		this.tailSprite.destroy();
		super.destroy();
	}
} 