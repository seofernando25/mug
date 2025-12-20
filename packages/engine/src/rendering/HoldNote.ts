import type { ChartHitObject } from "$lib/types";
import { Colors, GameplaySizingConstants } from "./constants";
import { type Container, Graphics } from "pixi.js";
import { GameNote } from "./GameNote";
import { getNoteYPosition, getEditorNoteYPosition } from "./noteUtils";

export class HoldNote extends GameNote {
	bodyGraphics: Graphics;
	tailGraphics: Graphics;
	duration: number;

	constructor(noteData: ChartHitObject, laneWidth: number) {
		super(noteData, laneWidth);
		if (
			noteData.note_type !== "hold" ||
			typeof noteData.duration !== "number" ||
			noteData.duration <= 0
		) {
			console.warn(
				`HoldNote created with invalid data: ID ${noteData.id}. Duration: ${noteData.duration}`,
			);
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
		const noteVisualWidth = this.laneWidth * 0.9;
		const laneNoteColor =
			Colors.LANE_COLORS[this.lane % Colors.LANE_COLORS.length];

		this.bodyGraphics.clear();
		// Body slightly narrower than the head for visual distinction
		const bodyWidth = noteVisualWidth * 0.8;
		this.bodyGraphics
			.rect(-bodyWidth / 2, 0, bodyWidth, 1)
			.fill({ color: laneNoteColor, alpha: 0.8 }); // Semi-transparent body

		this.tailGraphics.clear();
		const tailHeight = 30; // Match head height
		// Tail is a rectangle at the end
		this.tailGraphics
			.rect(-noteVisualWidth / 2, -tailHeight / 2, noteVisualWidth, tailHeight)
			.fill({ color: laneNoteColor });
	}

	addToStage(stage: Container) {
		// Add body and tail BEFORE head so head is on top
		if (!this.bodyGraphics.parent) stage.addChild(this.bodyGraphics);
		if (!this.tailGraphics.parent) stage.addChild(this.tailGraphics);
		super.addToStage(stage);
	}

	removeFromStage() {
		super.removeFromStage();
		if (this.bodyGraphics.parent)
			this.bodyGraphics.parent.removeChild(this.bodyGraphics);
		if (this.tailGraphics.parent)
			this.tailGraphics.parent.removeChild(this.tailGraphics);
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

	reset(newNoteData: ChartHitObject, newLaneWidth: number) {
		super.reset(newNoteData, newLaneWidth);
		if (
			newNoteData.note_type !== "hold" ||
			typeof newNoteData.duration !== "number" ||
			newNoteData.duration <= 0
		) {
			console.warn(
				`HoldNote reset with invalid data: ID ${newNoteData.id}. Duration: ${newNoteData.duration}`,
			);
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
		canvasHeight: number,
		isEditorMode: boolean, // New: Editor mode flag
		editorViewCenterTimeMs: number, // New: Editor viewport center time
		editorPixelsPerSecond: number, // New: Editor zoom level
	) {
		super.reposition(
			highwayX,
			songTimeMs,
			hitZoneY,
			receptorYPosition,
			scrollSpeed,
			canvasHeight,
			isEditorMode,
			editorViewCenterTimeMs,
			editorPixelsPerSecond,
		);

		const laneCenterX =
			highwayX + this.lane * this.laneWidth + this.laneWidth / 2;
		const noteEndTime = this.originalTime + this.duration;

		let currentHeadY = this.headGraphics.y;
		let currentTailY: number;

		if (isEditorMode) {
			currentTailY = getEditorNoteYPosition(
				noteEndTime,
				editorViewCenterTimeMs,
				editorPixelsPerSecond,
				canvasHeight,
			);
		} else {
			currentTailY = getNoteYPosition(
				noteEndTime,
				songTimeMs,
				receptorYPosition,
				scrollSpeed,
				canvasHeight,
			);
		}

		// Visually clamp head to not go past the tail if actively held (gameplay only)
		if (!isEditorMode && this.isActivelyHeld && currentHeadY < currentTailY) {
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
			const noteVisualWidth = this.laneWidth * 0.9;
			const bodyWidth = noteVisualWidth * 0.8;
			this.bodyGraphics
				.rect(-bodyWidth / 2, 0, bodyWidth, visualBodyHeight)
				.fill({
					color: Colors.LANE_COLORS[this.lane % Colors.LANE_COLORS.length],
					alpha: 0.8,
				});
		}
	}

	onResize(
		newLaneWidth: number,
		highwayX: number,
		songTimeMs: number,
		hitZoneY: number,
		receptorYPosition: number,
		scrollSpeed: number,
		canvasHeight: number,
		isEditorMode: boolean,
		editorViewCenterTimeMs: number,
		editorPixelsPerSecond: number,
	) {
		this.laneWidth = newLaneWidth;
		this._createOrUpdateHeadGraphics();
		this._createOrUpdateHoldPartsGraphics();
		this.reposition(
			highwayX,
			songTimeMs,
			hitZoneY,
			receptorYPosition,
			scrollSpeed,
			canvasHeight,
			isEditorMode,
			editorViewCenterTimeMs,
			editorPixelsPerSecond,
		);
	}

	isOffscreen(
		canvasHeight: number,
		receptorYPosition: number,
		songTimeMs: number,
		scrollSpeed: number,
		isEditorMode: boolean,
		editorViewCenterTimeMs: number,
		editorPixelsPerSecond: number,
	): boolean {
		if (this.duration <= 0) {
			return super.isOffscreen(
				canvasHeight,
				receptorYPosition,
				songTimeMs,
				scrollSpeed,
				isEditorMode,
				editorViewCenterTimeMs,
				editorPixelsPerSecond,
			);
		}
		const noteEndTime = this.originalTime + this.duration;
		let tailY: number;

		if (isEditorMode) {
			tailY = getEditorNoteYPosition(
				noteEndTime,
				editorViewCenterTimeMs,
				editorPixelsPerSecond,
				canvasHeight,
			);
			// In editor mode, consider offscreen if both head and tail are significantly outside view
			const headY = getEditorNoteYPosition(
				this.originalTime,
				editorViewCenterTimeMs,
				editorPixelsPerSecond,
				canvasHeight,
			);
			return (
				(headY < -100 && tailY < -100) ||
				(headY > canvasHeight + 100 && tailY > canvasHeight + 100)
			);
		} else {
			tailY = getNoteYPosition(
				noteEndTime,
				songTimeMs,
				receptorYPosition,
				scrollSpeed,
				canvasHeight,
			);
			return tailY > canvasHeight;
		}
	}
}
