import type { GameplayNote } from '../../types';
import * as PIXI from 'pixi.js';
import { NoteComponent, type NoteRenderConfig } from './NoteComponent';
import { getNoteYPosition } from '../utils/positionUtils';
import { atom, computed, effect } from 'nanostores';
import { Graphics } from 'pixi.js';

export class HoldNoteComponent extends NoteComponent {
	private headSprite = new HoldNoteHead();
	private bodySprite = new HoldNoteBody();
	private tailSprite = new HoldNoteTail();
	private cleanup: (() => void)[] = [];

	noteWidthRatio = atom(1);
	laneWidth = atom(40);

	constructor(noteData: GameplayNote, id: number) {
		super(noteData, id);
		this.label = "HoldNoteComponent";

		this.addChild(this.headSprite);
		this.addChild(this.bodySprite);
		this.addChild(this.tailSprite);

		this.cleanup.push(() => {
			this.headSprite.destroy();
			this.bodySprite.destroy();
			this.tailSprite.destroy();
		});
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
		const laneCenterX = highwayX + (this.noteData.lane + 0.5) * this.laneWidth.get();
		const noteWidth = this.laneWidth.get() * this.noteWidthRatio.get();
		this.x = laneCenterX - (noteWidth / 2);
		this.y = idealHeadY;

		// Position head sprite (relative to container)
		this.headSprite.x = 0;
		this.headSprite.y = 0;

		// Position and draw body sprite
		const bodyHeight = Math.max(0, Math.abs(idealTailY - idealHeadY) + 50); // Distance between head and tail minus head height
		this.bodySprite.x = 0; // Center the body
		this.bodySprite.y = -bodyHeight + 50; // Start just below the head
		this.bodySprite.noteHeight.set(bodyHeight);

		// Position tail sprite
		this.tailSprite.x = 0;
		this.tailSprite.y = idealTailY - idealHeadY; // Relative to container

		// Handle note states
		const noteIsActive = this.noteData.noteState.state.type === 'active';
		const noteIsWaiting = this.noteData.noteState.state.type === 'waiting';

		if (noteIsActive) {
			// When active, the head stays at the hit zone, adjust container position
			this.y = hitZoneY;

			// Recalculate body and tail positions relative to new container position
			const activeBodyHeight = Math.max(0, Math.abs(idealTailY - idealHeadY) + 50);
			this.bodySprite.y = 50; // Start just below the head
			this.bodySprite.noteHeight.set(activeBodyHeight);
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
		super.destroy();
		this.headSprite.destroy();
		this.bodySprite.destroy();
		this.tailSprite.destroy();
	}
}

class HoldNoteHead extends Graphics {
	private cleanup: (() => void)[] = [];

	noteColor = atom(0xffffff);
	noteWidthRatio = atom(1);
	laneWidth = atom(1);
	padding = atom(4);
	noteHeight = atom(50);
	noteWidth = computed([this.laneWidth, this.noteWidthRatio, this.padding], (laneWidth, noteWidthRatio, padding) => laneWidth * noteWidthRatio - padding * 2);
	cornerRadius = computed([this.noteWidth, this.noteHeight], (noteWidth, noteHeight) => Math.min(12, noteWidth / 6, noteHeight / 3));

	constructor() {
		super();
		
		this.label = "HoldNoteHead";

		this.cleanup.push(effect([this.noteColor, this.noteWidth, this.noteHeight, this.cornerRadius], (noteColor, noteWidth, noteHeight, cornerRadius) => {
			this.clear();

			// Draw the head note (same as tap note)
			this
				.roundRect(0, 0, this.noteWidth.get(), this.noteHeight.get(), this.cornerRadius.get())
				.fill({
					color: this.noteColor.get(),
					alpha: 0.9
				});

			// Add a subtle border for better visibility
			this
				.roundRect(0, 0, this.noteWidth.get(), this.noteHeight.get(), this.cornerRadius.get())
				.stroke({
					width: 1,
					color: 0xffffff,
					alpha: 0.3
				});
		}))

	}

	destroy(options?: PIXI.DestroyOptions): void {
		super.destroy(options);
		this.cleanup.forEach(cleanup => cleanup());
	}
}

class HoldNoteTail extends Graphics {
	private cleanup: (() => void)[] = [];

	noteColor = atom(0xffffff);
	noteWidthRatio = atom(1);
	laneWidth = atom(50);
	padding = atom(4);
	noteHeight = atom(50);
	noteWidth = computed([this.laneWidth, this.noteWidthRatio, this.padding], (laneWidth, noteWidthRatio, padding) => laneWidth * noteWidthRatio - padding * 2);
	cornerRadius = computed([this.noteWidth, this.noteHeight], (noteWidth, noteHeight) => Math.min(12, noteWidth / 6, noteHeight / 3));

	constructor() {
		super();

		this.label = "HoldNoteTail";
		
		this.cleanup.push(effect([this.noteColor, this.noteWidth, this.noteHeight, this.cornerRadius], (noteColor, noteWidth, noteHeight, cornerRadius) => {
			this.clear();

			// Draw the tail note (same as head but with a different shape)
			this
				.roundRect(0, 0, this.noteWidth.get(), this.noteHeight.get(), this.cornerRadius.get())
				.fill({
					color: this.noteColor.get(),
					alpha: 0.9
				});

			// Add a subtle border for better visibility
			this
				.roundRect(0, 0, this.noteWidth.get(), this.noteHeight.get(), this.cornerRadius.get())
				.stroke({
					width: 1,
					color: 0xffffff,
					alpha: 0.3
				});
		}));
	}

	destroy(options?: PIXI.DestroyOptions): void {
		super.destroy(options);
		this.cleanup.forEach(cleanup => cleanup());
	}
}

class HoldNoteBody extends Graphics {
	private cleanup: (() => void)[] = [];

	noteColor = atom(0xffffff);
	noteWidthRatio = atom(1);
	laneWidth = atom(30);
	padding = atom(4);
	noteHeight = atom(0);

	noteWidth = computed([this.laneWidth, this.noteWidthRatio, this.padding], (laneWidth, noteWidthRatio, padding) => laneWidth * noteWidthRatio - padding * 2);
	cornerRadius = computed([this.noteWidth], (noteWidth) => Math.min(12, noteWidth / 6, noteWidth / 3));

	constructor() {
		super();

		this.label = "HoldNoteBody";
		
		this.cleanup.push(effect([this.noteColor, this.noteWidth, this.noteHeight, this.cornerRadius], (noteColor, noteWidth, height, cornerRadius) => {
			this.clear();
			height = Math.max(0.1, height);

			// Draw the body connecting head to tail
			this
				.roundRect(0, 0, noteWidth, height, cornerRadius)
				.fill({
					color: noteColor,
					alpha: 0.9
				});

			// Add a subtle border for better visibility
			this
				.roundRect(0, 0, noteWidth, height, cornerRadius)
				.stroke({
					width: 1,
					color: 0xffffff,
					alpha: 0.3
				});
		}));
	}

	destroy(options?: PIXI.DestroyOptions): void {
		super.destroy(options);
		this.cleanup.forEach(cleanup => cleanup());
	}
}
