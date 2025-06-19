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
	) {
		super();
		const virtualScreenWidth = 1024;
		// const virtualScreenHeight = 768;
		const vPadding = 16;
		const lanePadding = 4;
		const highwayHeight = 768 - vPadding * 2;
		const laneWidth = 4 * 13;
		this.label = "HighwayRenderer";

		const cleanup: (() => void)[] = [];

		this.clear();




		const totalLanes = this.numLanes.get();
		for (let laneIdx = 0; laneIdx < totalLanes; laneIdx++) {
			const laneX = laneIdx * (laneWidth + lanePadding);

			this
				.rect(laneX, 0, laneWidth, highwayHeight)
				.fill({
					color: this.fillColor.get(),
					alpha: this.fillColor.get() !== undefined ? 0.3 : 0.2
				});
		}

		// center on 1024 wide screen
		this.x = virtualScreenWidth/2 - this.width / 2;
		this.y = vPadding;

		// this.pivot.set(-this.width / 2, -this.height / 2);
		
	}

	public destroy(): void {
		super.destroy({ children: true, texture: true });

		for (const cleanup of this.cleanup) {
			cleanup();
		}
	}
} 