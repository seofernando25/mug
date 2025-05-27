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
	glowEffect?: boolean; // Enable/disable inner glow on active receptors
	baseAlpha?: number; // Alpha for inactive receptors
	activeAlpha?: number; // Alpha for active receptors
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
		this.container.label = "ReceptorRenderer";
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

		// Add some padding for better visual separation
		const padding = 4;
		const actualWidth = config.laneWidth - padding * 2;
		const actualHeight = config.receptorHeight;
		const x = padding;
		const y = padding / 2;

		// Use custom corner radius or calculate based on receptor size
		const cornerRadius = Math.min(12, actualWidth / 6, actualHeight / 3);

		// Get alpha values from config or use defaults
		const baseAlpha = config.baseAlpha ?? 0.7;
		const activeAlpha = config.activeAlpha ?? 0.9;

		// Draw the main receptor body with rounded corners
		receptor.graphics
			.roundRect(x, y, actualWidth, actualHeight, cornerRadius)
			.fill({
				color: color,
				alpha: receptor.isActive ? activeAlpha : baseAlpha
			});

		// Add outline/border if configured
		if (config.outlineColor !== undefined && config.outlineThickness !== undefined) {
			receptor.graphics
				.roundRect(x, y, actualWidth, actualHeight, cornerRadius)
				.stroke({
					width: config.outlineThickness,
					color: config.outlineColor,
					alpha: receptor.isActive ? 1.0 : 0.8
				});
		}

		// Add a subtle inner glow effect when active (if enabled)
		const glowEnabled = config.glowEffect ?? true; // Default to true
		if (receptor.isActive && glowEnabled) {
			const glowPadding = 2;
			const innerRadius = Math.max(0, cornerRadius - 2);
			receptor.graphics
				.roundRect(
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