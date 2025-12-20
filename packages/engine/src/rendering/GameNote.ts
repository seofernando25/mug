import type { ChartHitObject } from "$lib/types";
import { Colors, GameplaySizingConstants } from "./constants";
import { type Container, Graphics } from "pixi.js";
import { getNoteYPosition, getEditorNoteYPosition } from "./noteUtils";

export class GameNote {
	id: number;
	headGraphics: Graphics;
	lane: number;
	originalTime: number;
	effectiveScrollTime: number;
	note_type: "tap" | "hold";
	isVisible: boolean = false;
	isJudged: boolean = false;
	isActivelyHeld: boolean = false;
	isBroken: boolean = false;
	isSatisfied: boolean = false;
	private prevIsActivelyHeld: boolean = false;

	protected noteData: ChartHitObject;
	laneWidth: number;

	constructor(noteData: ChartHitObject, laneWidth: number) {
		this.id = noteData.id;
		this.noteData = noteData;
		this.lane = noteData.lane;
		this.originalTime = noteData.time;
		this.effectiveScrollTime = noteData.time;
		this.note_type = noteData.note_type;
		this.laneWidth = laneWidth;

		this.headGraphics = new Graphics();
		this._createOrUpdateHeadGraphics();
		this.headGraphics.visible = false;
		this.isVisible = false;
		this.prevIsActivelyHeld = false;
	}

	protected _createOrUpdateHeadGraphics() {
		const noteVisualWidth = this.laneWidth * 0.9;
		const noteHeight = 30; // Fixed height for the rectangle
		const headColor = Colors.LANE_COLORS[this.lane % Colors.LANE_COLORS.length];

		this.headGraphics.clear();
		// Draw a rectangle centered horizontally
		this.headGraphics
			.rect(-noteVisualWidth / 2, -noteHeight / 2, noteVisualWidth, noteHeight)
			.fill({ color: headColor });
	}

	addToStage(stage: Container) {
		if (!this.headGraphics.parent) {
			stage.addChild(this.headGraphics);
		}
	}

	removeFromStage() {
		if (this.headGraphics.parent) {
			this.headGraphics.parent.removeChild(this.headGraphics);
		}
	}

	show() {
		this.headGraphics.visible = true;
		this.isVisible = true;
	}

	hide() {
		this.headGraphics.visible = false;
		this.isVisible = false;
	}

	reset(newNoteData: ChartHitObject, newLaneWidth: number) {
		this.noteData = newNoteData;
		this.id = newNoteData.id;
		this.lane = newNoteData.lane;
		this.originalTime = newNoteData.time;
		this.effectiveScrollTime = newNoteData.time;
		this.note_type = newNoteData.note_type;
		this.laneWidth = newLaneWidth;

		this.isJudged = false;
		this.isActivelyHeld = false;
		this.prevIsActivelyHeld = false;

		this._createOrUpdateHeadGraphics();
		this.hide();
	}

	reposition(
		highwayX: number,
		songTimeMs: number, // Current playback time (gameplay)
		hitZoneY: number, // Receptor Y position (gameplay)
		receptorYPosition: number, // Receptor Y position (gameplay)
		scrollSpeed: number, // Gameplay scroll speed
		canvasHeight: number,
		isEditorMode: boolean, // New: Editor mode flag
		editorViewCenterTimeMs: number, // New: Editor viewport center time
		editorPixelsPerSecond: number, // New: Editor zoom level
	) {
		const laneCenterX =
			highwayX + this.lane * this.laneWidth + this.laneWidth / 2;
		let idealHeadY: number;

		if (isEditorMode) {
			idealHeadY = getEditorNoteYPosition(
				this.originalTime, // In editor, use original time for positioning
				editorViewCenterTimeMs,
				editorPixelsPerSecond,
				canvasHeight,
			);
		} else {
			if (this.note_type === "hold") {
				if (this.isActivelyHeld) {
					idealHeadY = hitZoneY;
				} else {
					if (this.prevIsActivelyHeld) {
						const scrollPixelsPerSecond = canvasHeight * 0.6 * scrollSpeed;
						if (scrollPixelsPerSecond > 0) {
							this.effectiveScrollTime =
								songTimeMs +
								((receptorYPosition - hitZoneY) * 1000) / scrollPixelsPerSecond;
						} else {
							// Fallback if scroll speed is zero, should not happen in normal gameplay.
						}
						idealHeadY = hitZoneY;
					} else {
						idealHeadY = getNoteYPosition(
							this.effectiveScrollTime,
							songTimeMs,
							receptorYPosition,
							scrollSpeed,
							canvasHeight,
						);
					}
				}
			} else {
				idealHeadY = getNoteYPosition(
					this.effectiveScrollTime,
					songTimeMs,
					receptorYPosition,
					scrollSpeed,
					canvasHeight,
				);
			}
		}

		this.headGraphics.x = laneCenterX;
		this.headGraphics.y = idealHeadY;

		this.prevIsActivelyHeld = this.isActivelyHeld;
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
		let headY: number;
		if (isEditorMode) {
			headY = getEditorNoteYPosition(
				this.originalTime,
				editorViewCenterTimeMs,
				editorPixelsPerSecond,
				canvasHeight,
			);
			// In editor mode, a note is "offscreen" if it's far above or below the view
			return headY < -100 || headY > canvasHeight + 100; // Add some buffer
		} else {
			headY = getNoteYPosition(
				this.effectiveScrollTime,
				songTimeMs,
				receptorYPosition,
				scrollSpeed,
				canvasHeight,
			);
			// A small visual buffer might be needed if notes are large.
			return headY > canvasHeight;
		}
	}

	getChartHitObject(): ChartHitObject {
		return this.noteData;
	}
}
