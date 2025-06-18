import { atom, computed, effect } from 'nanostores';
import * as PIXI from 'pixi.js';
import type { GameplayNote } from '../../types';
import { getNoteYPosition } from '../utils/positionUtils';
import { NoteComponent } from './NoteComponent';

export class TapNoteComponent extends NoteComponent {
	private sprite = new PIXI.Graphics();
	private cleanup: (() => void)[] = [];

	noteColor = atom(0xffffff);
	noteWidthRatio = atom(1);
	laneWidth = atom(1);
	padding = atom(4);
	noteHeight = atom(50);
	noteWidth = computed([this.laneWidth, this.noteWidthRatio, this.padding], (laneWidth, noteWidthRatio, padding) => laneWidth * noteWidthRatio - padding * 2);
	cornerRadius = computed([this.noteWidth, this.noteHeight], (noteWidth, noteHeight) => Math.min(12, noteWidth / 6, noteHeight / 3));

	constructor(noteData: GameplayNote, id: number) {
		super(noteData, id);
		this.addChild(this.sprite);


		this.cleanup.push(effect([
			this.noteColor,
			this.noteWidth,
			this.noteHeight,
			this.cornerRadius
		], (noteColor, noteWidth, noteHeight, cornerRadius) => {
			this.sprite.clear();

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
		}));
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

		const laneCenterX = highwayX + (this.noteData.lane + 0.5) * this.laneWidth.get();
		const noteWidth = this.laneWidth.get() * this.noteWidthRatio.get();

		// Position the container (which contains the sprite)
		this.x = laneCenterX - (noteWidth / 2);
		this.y = idealY;
	}

	public destroy(): void {
		this.sprite.destroy();
		this.cleanup.forEach(fn => fn());
		super.destroy();
	}
} 