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
	}

	private drawHoldParts(): void {
		const noteColor = this.config.laneColors[this.noteData.lane] || 0xffffff;
		const noteWidth = this.config.canvasWidth * this.config.noteWidthRatio;


		this.bodySprite.clear();
		this.bodySprite.fill({ color: noteColor, alpha: 0.7 });
		this.bodySprite.rect(0, 0, noteWidth, 50);
		this.bodySprite.fill();

		this.tailSprite.clear();
		this.tailSprite.fill({ color: noteColor });
		this.tailSprite.rect(0, 0, noteWidth, 10);
		this.tailSprite.fill();
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
		const idealTailY = getNoteYPosition(
			songTimeMs,
			tailTimeMs,
			receptorYPosition,
			scrollSpeed,
			canvasHeight
		);

		this.bodySprite.x = this.sprite.x;
		this.bodySprite.y = headY;
		this.bodySprite.height = Math.max(0, idealTailY - headY);

		this.tailSprite.x = this.sprite.x;
		this.tailSprite.y = idealTailY;

		const noteIsActive = this.noteData.noteState.state.type === 'active';
		const noteIsWaiting = this.noteData.noteState.state.type === 'waiting';

		if (noteIsActive) {
			this.sprite.y = hitZoneY;
			this.bodySprite.y = hitZoneY;
			this.bodySprite.height = Math.max(0, idealTailY - hitZoneY);
		} else if (!noteIsWaiting) {
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