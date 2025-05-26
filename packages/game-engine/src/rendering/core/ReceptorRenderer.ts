import * as PIXI from 'pixi.js';

export interface ReceptorConfig {
	numLanes: number;
	laneWidth: number;
	receptorHeight: number;
	yPosition: number; // Y position of the top of the receptors
	highwayX: number; // Starting X position of the highway, for lane alignment
	baseColor?: number;
	activeColor?: number;
	outlineColor?: number;
	outlineThickness?: number;
}

interface ReceptorVisual {
	lane: number;
	graphics: PIXI.Graphics;
	isActive: boolean;
}

export class ReceptorRenderer {
	public container: PIXI.Container;
	private receptors: ReceptorVisual[] = [];
	private config: ReceptorConfig | null = null;

	constructor() {
		this.container = new PIXI.Container();
	}

	public draw(config: ReceptorConfig): void {
		this.config = config;
		this.receptors.forEach(r => r.graphics.destroy());
		this.receptors = [];
		this.container.removeChildren();

		for (let i = 0; i < config.numLanes; i++) {
			const graphics = new PIXI.Graphics();
			const receptor: ReceptorVisual = { lane: i, graphics, isActive: false };
			this._drawReceptor(receptor, config.baseColor || 0x444444, config); // Default inactive color

			graphics.x = i * config.laneWidth;
			graphics.y = 0; // Positioned relative to the container

			this.receptors.push(receptor);
			this.container.addChild(graphics);
		}
		this.container.x = config.highwayX;
		this.container.y = config.yPosition;
	}

	private _drawReceptor(receptor: ReceptorVisual, color: number, config: ReceptorConfig): void {
		receptor.graphics.clear();
		if (config.outlineColor !== undefined && config.outlineThickness !== undefined) {
			receptor.graphics.lineStyle(config.outlineThickness, config.outlineColor, 1);
		}
		receptor.graphics.beginFill(color);
		receptor.graphics.drawRect(0, 0, config.laneWidth, config.receptorHeight);
		receptor.graphics.endFill();
	}

	public activateReceptor(lane: number): void {
		if (!this.config) return;
		const receptor = this.receptors[lane];
		if (receptor && !receptor.isActive) {
			this._drawReceptor(receptor, this.config.activeColor || 0xffffff, this.config);
			receptor.isActive = true;
		}
	}

	public deactivateReceptor(lane: number): void {
		if (!this.config) return;
		const receptor = this.receptors[lane];
		if (receptor && receptor.isActive) {
			this._drawReceptor(receptor, this.config.baseColor || 0x444444, this.config);
			receptor.isActive = false;
		}
	}

	public onResize(newConfig: ReceptorConfig): void {
		this.draw(newConfig);
	}

	public setVisibility(visible: boolean): void {
		this.container.visible = visible;
	}

	public destroy(): void {
		this.container.destroy({ children: true, texture: true });
	}
} 