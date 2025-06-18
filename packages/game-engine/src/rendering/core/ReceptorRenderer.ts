import * as PIXI from 'pixi.js';
import { atom, effect, type Atom } from 'nanostores';

// Shared configuration store for receptors
export const receptorConfig = {
	laneWidth: atom(75),
	receptorHeight: atom(50),
	baseColor: atom(0x333333),
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

	constructor(screenHeight: Atom<number>) {
		super();
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
		
			for (let i = 0; i < this.numLanes.get(); i++) { 
				const receptor = new Receptor(i);
				receptor.x = (i - this.numLanes.get() / 2) * receptorConfig.laneWidth.get();
				receptor.y = screenHeight.get() * (0.5 * 0.85);
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
			receptorConfig.laneWidth,
			receptorConfig.receptorHeight,
			receptorConfig.baseColor,
			receptorConfig.activeColor,
			receptorConfig.outlineColor,
			receptorConfig.outlineThickness,
			receptorConfig.baseAlpha,
			receptorConfig.activeAlpha
		], (activeLanes, laneWidth, receptorHeight, baseColor, activeColor, outlineColor, outlineThickness, baseAlpha, activeAlpha) => {
			this.clear();
			const isActive = activeLanes.has(this.lane);
			const padding = 4;
			const actualWidth = laneWidth - padding * 2;
			const actualHeight = receptorHeight;
			const x = padding;
			const y = -padding * 5;
			const cornerRadius = Math.min(12, actualWidth / 6, actualHeight / 3);
			this.roundRect(x, y, actualWidth, receptorHeight, cornerRadius)
				.fill({
					color: isActive ? activeColor : baseColor,
					alpha: isActive ? activeAlpha : baseAlpha
				});
			this.roundRect(x, y, actualWidth, receptorHeight, cornerRadius)
				.stroke({
					width: outlineThickness,
					color: outlineColor,
					alpha: isActive ? 1.0 : 0.8
				});
			if (isActive) {
				const glowPadding = 2;
				const innerRadius = Math.max(0, cornerRadius - 2);
				this.roundRect(
					x + glowPadding,
					y + glowPadding,
					actualWidth - glowPadding * 2,
					actualHeight - glowPadding * 2,
					innerRadius
				)
				.fill({
					color: 0xffffff,
					alpha: 0.3
				});
			}
		}));
	}

	public destroy(): void {
		this.cleanup.forEach(fn => fn());
		super.destroy({ children: true, texture: true });
	}
}