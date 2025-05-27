import * as PIXI from 'pixi.js';

export interface ProgressBarConfig {
	screenWidth: number;
	screenHeight: number;
	height?: number; // Height of the progress bar
	yPosition?: number; // Y position (default: bottom of screen)
	backgroundColor?: number; // Background color
	backgroundAlpha?: number; // Background transparency
	progressColor?: number; // Progress fill color
	progressAlpha?: number; // Progress fill transparency
	borderColor?: number; // Optional border color
	borderThickness?: number; // Optional border thickness
}

export class ProgressBarRenderer {
	public container: PIXI.Container;
	private backgroundGraphics: PIXI.Graphics;
	private progressGraphics: PIXI.Graphics;
	private borderGraphics?: PIXI.Graphics;
	private config: ProgressBarConfig;
	private currentProgress: number = 0; // 0 to 1

	constructor(initialConfig: ProgressBarConfig) {
		this.config = initialConfig;
		this.container = new PIXI.Container();
		this.container.label = "ProgressBarRenderer";

		// Create graphics objects
		this.backgroundGraphics = new PIXI.Graphics();
		this.progressGraphics = new PIXI.Graphics();

		// Add to container in correct order
		this.container.addChild(this.backgroundGraphics);
		this.container.addChild(this.progressGraphics);

		// Optional border
		if (initialConfig.borderColor !== undefined && initialConfig.borderThickness !== undefined) {
			this.borderGraphics = new PIXI.Graphics();
			this.container.addChild(this.borderGraphics);
		}

		this.draw();
	}

	private draw(): void {
		const height = this.config.height || 8;
		const yPosition = this.config.yPosition !== undefined
			? this.config.yPosition
			: this.config.screenHeight - height;

		// Clear all graphics
		this.backgroundGraphics.clear();
		this.progressGraphics.clear();
		if (this.borderGraphics) {
			this.borderGraphics.clear();
		}

		// Draw background
		this.backgroundGraphics.rect(0, yPosition, this.config.screenWidth, height);
		this.backgroundGraphics.fill({
			color: this.config.backgroundColor || 0x000000,
			alpha: this.config.backgroundAlpha || 0.3
		});

		// Draw progress
		const progressWidth = this.config.screenWidth * this.currentProgress;
		if (progressWidth > 0) {
			this.progressGraphics.rect(0, yPosition, progressWidth, height);
			this.progressGraphics.fill({
				color: this.config.progressColor || 0xffffff,
				alpha: this.config.progressAlpha || 0.7
			});
		}

		// Draw border if configured
		if (this.borderGraphics && this.config.borderColor !== undefined && this.config.borderThickness !== undefined) {
			this.borderGraphics.stroke({
				width: this.config.borderThickness,
				color: this.config.borderColor,
				alpha: 1
			});
			this.borderGraphics.rect(0, yPosition, this.config.screenWidth, height);
		}
	}

	public updateProgress(progress: number): void {
		// Clamp progress between 0 and 1
		this.currentProgress = Math.max(0, Math.min(1, progress));
		this.draw();
	}

	public updateConfig(newConfig: ProgressBarConfig): void {
		this.config = newConfig;
		this.draw();
	}

	public onResize(screenWidth: number, screenHeight: number): void {
		this.config.screenWidth = screenWidth;
		this.config.screenHeight = screenHeight;
		this.draw();
	}

	public setVisibility(visible: boolean): void {
		this.container.visible = visible;
	}

	public destroy(): void {
		this.container.destroy({ children: true, texture: true });
	}
} 