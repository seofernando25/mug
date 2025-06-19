import * as PIXI from 'pixi.js';
import { atom, effect, type Atom } from 'nanostores';

// Shared configuration store for receptors
export const receptorConfig = {
	laneWidth: atom(75),
	receptorHeight: atom(50),
	baseColor: atom(0xaa3333),
	activeColor: atom(0xffffff),
	outlineColor: atom(0x333333),
	outlineThickness: atom(2),
	baseAlpha: atom(0.7),
	activeAlpha: atom(0.9),
};

// Shared state store for receptor activation
export const receptorActiveLanes = atom<Set<number>>(new Set());

export function setReceptorActive(lane: number, active: boolean) {
	const current = receptorActiveLanes.get();
	const next = new Set(current);
	if (active) {
		next.add(lane);
	} else {
		next.delete(lane);
	}
	receptorActiveLanes.set(next);
}

interface ReceptorVisual {
	lane: number;
	receptor: Receptor;
}

export class ReceptorRenderer extends PIXI.Container {
	private receptors: ReceptorVisual[] = [];
	private cleanup: (() => void)[] = [];

	numLanes = atom(4);

	constructor() {
		super();

		const virtualScreenWidth = 1024;
		const virtualScreenHeight = 768;

		this.label = "ReceptorRenderer";

		// Reactively (re)create receptors when config changes
		this.cleanup.push(effect([
			receptorConfig.laneWidth,
			receptorConfig.receptorHeight,
			receptorConfig.baseColor,
			receptorConfig.activeColor,
			receptorConfig.outlineColor,
			receptorConfig.outlineThickness,
			receptorConfig.baseAlpha,
			receptorConfig.activeAlpha
		], () => {
			// Cleanup old receptors
			this.receptors.forEach(r => {
				r.receptor.destroy();
			});
			this.receptors = [];
			this.removeChildren();


			const numLanes = this.numLanes.get();
			const lanesTotalWidth = numLanes * 4 * 13 + numLanes * 4;
			const startX = virtualScreenWidth/2 - lanesTotalWidth/2 + 4

			for (let i = 0; i < numLanes; i++) { 
				const receptor = new Receptor(i);

				receptor.x = startX  + i * 4 * 14;
				receptor.y = virtualScreenHeight * ( 0.8);

				this.receptors.push({ lane: i, receptor });
				this.addChild(receptor);
			}
		}));
	}

	public destroy(): void {
		super.destroy({ children: true, texture: true });
		this.receptors.forEach(r => {
			r.receptor.destroy();
		});
		this.receptors = [];
		this.cleanup.forEach(fn => fn());
	}
}

class Receptor extends PIXI.Graphics {
	public cleanup: (() => void)[] = [];
	private lane: number;
	
	constructor(lane: number) {
		super();
		this.lane = lane;
		// React to shared receptorActiveLanes
		this.cleanup.push(effect([
			receptorActiveLanes,
			receptorConfig.baseColor,
			receptorConfig.activeColor,
			receptorConfig.outlineColor,
			receptorConfig.outlineThickness,
			receptorConfig.baseAlpha,
			receptorConfig.activeAlpha
		], (activeLanes, baseColor, activeColor, outlineColor, outlineThickness, baseAlpha, activeAlpha) => {
			this.clear();
			const isActive = activeLanes.has(this.lane);
			const width = 4 * 12;
			const height = 4 * 12;
			this.rect(0, 0, width, height)
				.fill({
					color: isActive ? activeColor : baseColor,
					alpha: isActive ? activeAlpha : baseAlpha
				});
			this.rect(0, 0, width, height)
				// .stroke({
				// 	width: outlineThickness,
				// 	color: outlineColor,
				// 	alpha: isActive ? 1.0 : 0.8
				// });
			if (isActive) {
				this.rect(
					0,
					0,
					width,
					height,
				)
				.fill({
					color: 0xffffff,
					alpha: 0.3
				});
			}
		}));
		// this.pivot.set(this.width / 2, this.height / 2);
	}

	public destroy(): void {
		this.cleanup.forEach(fn => fn());
		super.destroy({ children: true, texture: true });
	}
}