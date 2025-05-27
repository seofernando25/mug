import type { GameplayNote } from '../../types';
import * as PIXI from 'pixi.js';
import { GameNote, type NoteRenderConfig } from './GameNote';
import { getNoteYPosition } from '../utils/positionUtils';

export class HoldNote extends GameNote {
	public bodySprite: PIXI.Graphics;
	public tailSprite: PIXI.Graphics;

	constructor(noteData: GameplayNote, id: number, config: NoteRenderConfig) {
		super(noteData, id, config);
		this.bodySprite = new PIXI.Graphics();
		this.tailSprite = new PIXI.Graphics();
		this.drawHoldParts();
		// Initially hide body and tail until updatePosition is called
		this.bodySprite.visible = false;
		this.tailSprite.visible = false;
	}

	private drawHoldParts(): void {
		const noteColor = this.config.laneColors[this.noteData.lane] || 0xffffff;
		const padding = 4;
		const noteWidth = this.config.laneWidth * this.config.noteWidthRatio - padding * 2;
		const headHeight = 50; // Height of the head note (matching regular notes)
		const tailHeight = 50; // Height of the tail note
		const cornerRadius = Math.min(12, noteWidth / 6, headHeight / 3);

		// Clear previous drawings
		this.bodySprite.clear();
		this.tailSprite.clear();

		// Draw tail (end note) with rounded corners matching regular notes
		// this.tailSprite
		// 	.roundRect(0, 0, noteWidth, tailHeight, cornerRadius)
		// 	.fill({
		// 		color: noteColor,
		// 		alpha: 0.9
		// 	});

		// Add border to tail
		// this.tailSprite
		// 	.roundRect(0, 0, noteWidth, tailHeight, cornerRadius)
		// 	.stroke({
		// 		width: 1,
		// 		color: 0xffffff,
		// 		alpha: 0.3
		// 	});

		// Body will be drawn dynamically in redrawBody method
	}

	private redrawBody(height: number): void {
		const noteColor = this.config.laneColors[this.noteData.lane] || 0xffffff;
		const bodyWidth = 20; // Simple small width

		// Clear and redraw body with the specified height
		this.bodySprite.clear();

		if (height > 0) {
			// Simple rectangle from head to tail
			// this.bodySprite
			// 	.rect(0, 0, bodyWidth, height)
			// 	.fill({
			// 		color: noteColor,
			// 		alpha: 0.7
			// 	});
		}
	}

	override addToStage(stage: PIXI.Container): void {
		super.addToStage(stage);
		if (!this.bodySprite.parent) {
			stage.addChild(this.bodySprite);
		}
		if (!this.tailSprite.parent) {
			stage.addChild(this.tailSprite);
		}
	}

	override removeFromStage(): void {
		super.removeFromStage();
		if (this.bodySprite.parent) {
			this.bodySprite.parent.removeChild(this.bodySprite);
		}
		if (this.tailSprite.parent) {
			this.tailSprite.parent.removeChild(this.tailSprite);
		}
	}

	override show(): void {
		super.show();
		this.bodySprite.visible = true;
		this.tailSprite.visible = true;
	}

	override hide(): void {
		super.hide();
		this.bodySprite.visible = false;
		this.tailSprite.visible = false;
	}

	override updatePosition(songTimeMs: number, hitZoneY: number, receptorYPosition: number, scrollSpeed: number, canvasHeight: number, highwayX: number): void {
		super.updatePosition(songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight, highwayX);

		if (this.noteData.noteInfo.type !== 'hold') return;

		const headY = this.sprite.y;
		const tailTimeMs = this.noteData.timeMs + this.noteData.noteInfo.durationMs;

		// Fix parameter order: noteTime, currentTime, receptorY, scrollSpeed, canvasHeight
		const idealTailY = getNoteYPosition(
			tailTimeMs,      // noteTime - when the tail should be hit
			songTimeMs,      // currentTime - current song position  
			receptorYPosition,
			scrollSpeed,
			canvasHeight
		);

		// Position body and tail relative to head - center the small body
		const bodyWidth = 20;
		const noteWidth = this.config.laneWidth * this.config.noteWidthRatio;
		this.bodySprite.x = this.sprite.x + (noteWidth - bodyWidth) / 2;
		this.bodySprite.y = headY + 50; // Start just below the head note

		// Calculate body height (distance between head and tail)
		const bodyHeight = Math.max(0, idealTailY - (headY + 50));

		this.tailSprite.x = this.sprite.x;
		this.tailSprite.y = idealTailY;

		const noteIsActive = this.noteData.noteState.state.type === 'active';
		const noteIsWaiting = this.noteData.noteState.state.type === 'waiting';

		if (noteIsActive) {
			// When active, the head stays at the hit zone
			this.sprite.y = hitZoneY;
			this.bodySprite.y = hitZoneY + 50; // Body starts just below the head
			const activeBodyHeight = Math.max(0, idealTailY - (hitZoneY + 50));
			// this.redrawBody(activeBodyHeight);
			this.bodySprite.visible = true;
			this.tailSprite.visible = true;
		} else if (noteIsWaiting) {
			// Normal scrolling - show all parts
			// this.redrawBody(bodyHeight);
			this.bodySprite.visible = true;
			this.tailSprite.visible = true;
		} else {
			// Hide body and tail when note is complete
			this.bodySprite.visible = false;
			this.tailSprite.visible = false;
		}
	}

	override onResize(highwayX: number, songTimeMs: number, hitZoneY: number, receptorYPosition: number, scrollSpeed: number, canvasHeight: number): void {
		super.onResize(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
		this.drawHoldParts();
	}

	override reset(noteData: GameplayNote, id: number, config: NoteRenderConfig) {
		super.reset(noteData, id, config);
		this.drawHoldParts();
		this.bodySprite.visible = false;
		this.tailSprite.visible = false;
	}
} 