import * as PIXI from 'pixi.js';
import { atom, computed, effect, type Atom } from 'nanostores';


export class HighwayRenderer extends PIXI.Graphics {
	private cleanup: (() => void)[] = [];
	numLanes = atom(4);
	laneWidth = atom(75);
	fillColor = atom(0x333333);
	borderColor = atom(0x333333);
	borderThickness = atom(2);
	laneSeparatorColor = atom(0x333333);

	laneCenterOffsets = computed([this.laneWidth, this.numLanes], (laneWidth, numLanes) => {
		return Array.from({ length: numLanes }, (_, i) => i * laneWidth + laneWidth / 2);
	});
	

	constructor(
		screenHeight: Atom<number>
	) {
		super();
		this.label = "HighwayRenderer";

		const cleanup: (() => void)[] = [];

		const highwayHeight = computed([screenHeight], (h) => {
			return h * 0.95;
		});

		// Rendering
		cleanup.push(effect([screenHeight], (h) => {
			this.clear();

			// Draw each lane individually as rounded rectangles
			for (let lane = 0; lane < this.numLanes.get(); lane++) {
				// Calculate lane position and dimensions
				const laneX = lane * this.laneWidth.get();
				const laneY = 0;
				const laneWidth = this.laneWidth.get();
				const laneHeight = highwayHeight.get();

				// Add some padding between lanes for visual separation
				const lanePadding = 2;
				const actualLaneWidth = laneWidth - lanePadding * 2;
				const actualLaneX = laneX + lanePadding;

				// Draw the lane as a rounded rectangle
				this
					.rect(actualLaneX, laneY, actualLaneWidth, laneHeight)
					.fill({
						color: this.fillColor.get(),
						alpha: this.fillColor.get() !== undefined ? 0.3 : 0.2
					})
					.stroke({
						width: this.borderThickness.get(),
						color: this.borderColor.get(),
						alpha: 0.6
					});
			}

			// Debug to show that lane center offsets are correct
			// for (const laneCenterOffset of this.laneCenterOffsets.get()) {
			// 	this.rect(laneCenterOffset, 0, 1, highwayHeight.get())
			// 		.fill({
			// 			color: "red",
			// 			alpha: 0.6
			// 		});
			// }

			this.pivot.set(this.width / 2, this.height / 2);
		}));
	}

	public destroy(): void {
		super.destroy({ children: true, texture: true });

		for (const cleanup of this.cleanup) {
			cleanup();
		}
	}
} 