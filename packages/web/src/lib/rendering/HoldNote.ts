import { LANE_COLORS } from '$lib/colors';
import { NOTE_WIDTH_RATIO } from './constants';
import type { schema } from 'db/src';
import { Container, Graphics } from 'pixi.js';
import { GameNote } from './GameNote';
import { getNoteYPosition } from './noteUtils';

export class HoldNote extends GameNote {
	bodyGraphics: Graphics;
	tailGraphics: Graphics;
	duration: number;

	constructor(noteData: typeof schema.chartHitObject.$inferSelect, laneWidth: number) {
		super(noteData, laneWidth);
		if (noteData.note_type !== 'hold' || typeof noteData.duration !== 'number' || noteData.duration <= 0) {
			console.warn(`HoldNote created with invalid data: ID ${noteData.id}. Duration: ${noteData.duration}`);
			this.duration = 0;
		} else {
			this.duration = noteData.duration;
		}

		this.bodyGraphics = new Graphics();
		this.tailGraphics = new Graphics();
		this._createOrUpdateHoldPartsGraphics();
		this.bodyGraphics.visible = false;
		this.tailGraphics.visible = false;
	}

	protected _createOrUpdateHoldPartsGraphics() {
		const noteVisualWidth = this.laneWidth * (NOTE_WIDTH_RATIO * 0.5);
		const laneNoteColor = LANE_COLORS[this.lane % LANE_COLORS.length];

		this.bodyGraphics.clear();
		const bodyWidth = noteVisualWidth * 0.5;
		this.bodyGraphics.rect(-bodyWidth / 2, 0, bodyWidth, 1)
			.fill({ color: laneNoteColor });

		this.tailGraphics.clear();
		const noteRadius = noteVisualWidth / 2;
		this.tailGraphics.circle(0, 0, noteRadius).fill({ color: laneNoteColor });
	}

	addToStage(stage: Container) {
		super.addToStage(stage);
		if (!this.bodyGraphics.parent) stage.addChild(this.bodyGraphics);
		if (!this.tailGraphics.parent) stage.addChild(this.tailGraphics);
	}

	removeFromStage() {
		super.removeFromStage();
		if (this.bodyGraphics.parent) this.bodyGraphics.parent.removeChild(this.bodyGraphics);
		if (this.tailGraphics.parent) this.tailGraphics.parent.removeChild(this.tailGraphics);
	}

	show() {
		super.show();
		this.bodyGraphics.visible = true;
		this.tailGraphics.visible = true;
	}

	hide() {
		super.hide();
		this.bodyGraphics.visible = false;
		this.tailGraphics.visible = false;
	}

	reset(newNoteData: typeof schema.chartHitObject.$inferSelect, newLaneWidth: number) {
		super.reset(newNoteData, newLaneWidth);
		if (newNoteData.note_type !== 'hold' || typeof newNoteData.duration !== 'number' || newNoteData.duration <= 0) {
			console.warn(`HoldNote reset with invalid data: ID ${newNoteData.id}. Duration: ${newNoteData.duration}`);
			this.duration = 0;
		} else {
			this.duration = newNoteData.duration;
		}
		this._createOrUpdateHoldPartsGraphics();
		this.bodyGraphics.visible = false;
		this.tailGraphics.visible = false;
	}

	reposition(
		highwayX: number,
		songTimeMs: number,
		hitZoneY: number,
		receptorYPosition: number,
		scrollSpeed: number,
		canvasHeight: number
	) {
		super.reposition(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);

		const laneCenterX = highwayX + (this.lane * this.laneWidth) + (this.laneWidth / 2);
		const noteEndTime = this.originalTime + this.duration;

		let currentHeadY = this.headGraphics.y;
		const currentTailY = getNoteYPosition(noteEndTime, songTimeMs, receptorYPosition, scrollSpeed, canvasHeight);

		// Visually clamp head to not go past the tail if actively held
		if (this.isActivelyHeld && currentHeadY < currentTailY) {
			currentHeadY = currentTailY;
			this.headGraphics.y = currentHeadY; // Update the actual graphic position
		}

		this.tailGraphics.x = laneCenterX;
		this.tailGraphics.y = currentTailY;

		this.bodyGraphics.x = laneCenterX;

		const topY = Math.min(currentHeadY, currentTailY);
		const bottomY = Math.max(currentHeadY, currentTailY);
		const visualBodyHeight = bottomY - topY;

		this.bodyGraphics.y = topY;

		this.bodyGraphics.clear();
		if (visualBodyHeight > 0 && this.duration > 0) {
			const noteVisualWidthForBody = this.laneWidth * (NOTE_WIDTH_RATIO * 0.5);
			const bodyRectWidth = noteVisualWidthForBody * 0.5;
			this.bodyGraphics.rect(-bodyRectWidth / 2, 0, bodyRectWidth, visualBodyHeight)
				.fill({ color: LANE_COLORS[this.lane % LANE_COLORS.length] });
		}
	}

	onResize(newLaneWidth: number, highwayX: number, songTimeMs: number, hitZoneY: number, receptorYPosition: number, scrollSpeed: number, canvasHeight: number) {
		this.laneWidth = newLaneWidth;
		this._createOrUpdateHeadGraphics();
		this._createOrUpdateHoldPartsGraphics();
		this.reposition(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
	}

	isOffscreen(canvasHeight: number, receptorYPosition: number, songTimeMs: number, scrollSpeed: number): boolean {
		if (this.duration <= 0) {
			return super.isOffscreen(canvasHeight, receptorYPosition, songTimeMs, scrollSpeed);
		}
		const noteEndTime = this.originalTime + this.duration;
		const tailY = getNoteYPosition(noteEndTime, songTimeMs, receptorYPosition, scrollSpeed, canvasHeight);
		return tailY > canvasHeight;
	}
} 