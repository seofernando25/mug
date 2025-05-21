import type { ChartHitObject } from '$lib/types';
import { AlphaValues, Colors, GameplaySizingConstants } from '$lib/types';
import { Container, Graphics } from 'pixi.js';
import { getNoteYPosition } from './noteUtils';

export class GameNote {
	id: number;
	headGraphics: Graphics;
	lane: number;
	originalTime: number; // Renamed from time: original chart time
	effectiveScrollTime: number; // Time used for Y position calculation
	note_type: 'tap' | 'hold';
	isVisible: boolean = false;
	isJudged: boolean = false;
	isActivelyHeld: boolean = false;
	private prevIsActivelyHeld: boolean = false; // To detect hold release

	protected noteData: ChartHitObject;
	laneWidth: number; // Stored to allow resizing

	constructor(noteData: ChartHitObject, laneWidth: number) {
		this.id = noteData.id;
		this.noteData = noteData;
		this.lane = noteData.lane;
		this.originalTime = noteData.time;
		this.effectiveScrollTime = noteData.time; // Initialize effectiveScrollTime
		this.note_type = noteData.note_type;
		this.laneWidth = laneWidth;

		this.headGraphics = new Graphics();
		this._createOrUpdateHeadGraphics();
		this.headGraphics.visible = false;
		this.isVisible = false;
		this.prevIsActivelyHeld = false;
	}

	protected _createOrUpdateHeadGraphics() {
		const noteVisualWidth = this.laneWidth * (GameplaySizingConstants.NOTE_WIDTH_RATIO * 0.5);
		const noteRadius = noteVisualWidth / 2;
		const headColor = this.note_type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP;

		this.headGraphics.clear();
		this.headGraphics.circle(0, 0, noteRadius).fill({ color: headColor, alpha: AlphaValues.NOTE_IDLE });
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
		this.effectiveScrollTime = newNoteData.time; // Reset effectiveScrollTime
		this.note_type = newNoteData.note_type;
		this.laneWidth = newLaneWidth;

		this.isJudged = false;
		this.isActivelyHeld = false;
		this.prevIsActivelyHeld = false; // Reset prevIsActivelyHeld

		this._createOrUpdateHeadGraphics();
		this.hide();
	}

	reposition(
		highwayX: number,
		songTimeMs: number,
		hitZoneY: number,
		receptorYPosition: number, // Added for clarity in calculation
		scrollSpeed: number,
		canvasHeight: number
	) {
		const laneCenterX = highwayX + (this.lane * this.laneWidth) + (this.laneWidth / 2);
		let idealHeadY: number;

		if (this.note_type === 'hold') {
			if (this.isActivelyHeld) {
				idealHeadY = hitZoneY;
				// effectiveScrollTime is not updated while actively held, as Y is fixed
			} else {
				if (this.prevIsActivelyHeld) {
					// Just released this frame: recalculate effectiveScrollTime to start scrolling from hitZoneY
					const scrollPixelsPerSecond = canvasHeight * 0.6 * scrollSpeed;
					if (scrollPixelsPerSecond > 0) { // Avoid division by zero
						this.effectiveScrollTime = songTimeMs + ((receptorYPosition - hitZoneY) * 1000 / scrollPixelsPerSecond);
					} else {
						// Fallback or maintain current effectiveScrollTime if scroll speed is zero
						// This case should ideally not happen in active gameplay with scrolling notes
					}
					// For this frame, head is at hitZoneY. Next frame it will scroll using the new effectiveScrollTime.
					idealHeadY = hitZoneY;
				} else {
					// Not actively held, and was not held last frame (or never held)
					idealHeadY = getNoteYPosition(this.effectiveScrollTime, songTimeMs, receptorYPosition, scrollSpeed, canvasHeight);
				}
			}
		} else { // For tap notes
			idealHeadY = getNoteYPosition(this.effectiveScrollTime, songTimeMs, receptorYPosition, scrollSpeed, canvasHeight);
		}

		this.headGraphics.x = laneCenterX;
		this.headGraphics.y = idealHeadY;

		this.prevIsActivelyHeld = this.isActivelyHeld; // Update for next frame
	}

	onResize(newLaneWidth: number, highwayX: number, songTimeMs: number, hitZoneY: number, receptorYPosition: number, scrollSpeed: number, canvasHeight: number) {
		this.laneWidth = newLaneWidth;
		this._createOrUpdateHeadGraphics();
		// Pass receptorYPosition to reposition
		this.reposition(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
	}

	isOffscreen(canvasHeight: number, receptorYPosition: number, songTimeMs: number, scrollSpeed: number): boolean {
		// Use effectiveScrollTime for offscreen check
		const headY = getNoteYPosition(this.effectiveScrollTime, songTimeMs, receptorYPosition, scrollSpeed, canvasHeight);
		// If it was held and just released, its current headGraphics.y might be hitZoneY,
		// but its effectiveScrollTime might make it seem offscreen if not handled carefully.
		// However, for simplicity, we rely on effectiveScrollTime reflecting its true scroll path.
		// A small visual buffer might be needed if notes are large.
		return headY > canvasHeight;
	}

	getChartHitObject(): ChartHitObject {
		return this.noteData;
	}
} 