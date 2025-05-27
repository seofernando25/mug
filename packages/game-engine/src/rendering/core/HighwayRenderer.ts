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
		this.container.label = "HighwayRenderer";
		this.graphics = new PIXI.Graphics();
		this.container.addChild(this.graphics);
	}

	public draw(config: HighwayConfig): void {
		this.graphics.clear();

		// Draw each lane individually as rounded rectangles
		for (let lane = 0; lane < config.numLanes; lane++) {
			// Calculate lane position and dimensions
			const laneX = lane * config.laneWidth;
			const laneY = 0;
			const laneWidth = config.laneWidth;
			const laneHeight = config.highwayHeight;

			// Add some padding between lanes for visual separation
			const lanePadding = 2;
			const actualLaneWidth = laneWidth - lanePadding * 2;
			const actualLaneX = laneX + lanePadding;

			// Set rounded corner radius
			const cornerRadius = Math.min(8, actualLaneWidth / 4, laneHeight / 20);

			// Draw the lane as a rounded rectangle
			this.graphics
				.roundRect(actualLaneX, laneY, actualLaneWidth, laneHeight, cornerRadius)
				.fill({
					color: config.fillColor !== undefined ? config.fillColor : 0x333333,
					alpha: config.fillColor !== undefined ? 0.3 : 0.2
				});

			// Add lane border if configured
			if (config.borderColor !== undefined && config.borderThickness !== undefined) {
				this.graphics
					.roundRect(actualLaneX, laneY, actualLaneWidth, laneHeight, cornerRadius)
					.stroke({
						width: config.borderThickness,
						color: config.borderColor,
						alpha: 0.6
					});
			}
		}

		// Draw overall highway border if configured
		// if (config.borderColor !== undefined && config.borderThickness !== undefined) {
		// 	const outerCornerRadius = 12;
		// 	this.graphics
		// 		.roundRect(
		// 			-config.borderThickness / 2,
		// 			-config.borderThickness / 2,
		// 			config.highwayWidth + config.borderThickness,
		// 			config.highwayHeight + config.borderThickness,
		// 			outerCornerRadius
		// 		)
		// 		.stroke({
		// 			width: config.borderThickness,
		// 			color: config.borderColor,
		// 			alpha: 1
		// 		});
		// }

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