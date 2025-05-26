import * as PIXI from 'pixi.js';

export interface HighwayConfig {
	numLanes: number;
	laneWidth: number; // Calculated width of a single lane
	highwayWidth: number; // Total width of all lanes
	highwayHeight: number;
	x: number; // Top-left X position of the highway
	y: number; // Top-left Y position of the highway
	fillColor?: number;
	borderColor?: number;
	borderThickness?: number;
	laneSeparatorColor?: number;
	laneSeparatorThickness?: number;
}

export class HighwayRenderer {
	public container: PIXI.Container;
	private graphics: PIXI.Graphics;

	constructor() {
		this.container = new PIXI.Container();
		this.graphics = new PIXI.Graphics();
		this.container.addChild(this.graphics);
	}

	public draw(config: HighwayConfig): void {
		this.graphics.clear();

		// Draw highway background/border
		if (config.borderColor !== undefined && config.borderThickness !== undefined) {
			this.graphics.lineStyle(config.borderThickness, config.borderColor, 1);
		}
		this.graphics.beginFill(config.fillColor !== undefined ? config.fillColor : 0x000000, config.fillColor !== undefined ? 0.1 : 0.0); // Slight fill or transparent
		this.graphics.drawRect(0, 0, config.highwayWidth, config.highwayHeight);
		this.graphics.endFill();

		// Draw lane separators
		if (config.laneSeparatorColor !== undefined && config.laneSeparatorThickness !== undefined && config.numLanes > 1) {
			this.graphics.lineStyle(config.laneSeparatorThickness, config.laneSeparatorColor, 0.5);
			for (let i = 1; i < config.numLanes; i++) {
				const x = i * config.laneWidth;
				this.graphics.moveTo(x, 0);
				this.graphics.lineTo(x, config.highwayHeight);
			}
		}

		this.container.x = config.x;
		this.container.y = config.y;
	}

	public onResize(newConfig: HighwayConfig): void {
		this.draw(newConfig);
	}

	public setVisibility(visible: boolean): void {
		this.container.visible = visible;
	}

	public destroy(): void {
		this.container.destroy({ children: true, texture: true });
	}
} 