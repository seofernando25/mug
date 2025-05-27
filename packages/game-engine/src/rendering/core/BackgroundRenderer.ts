import * as PIXI from 'pixi.js';

export interface BackgroundConfig {
	screenWidth: number;
	screenHeight: number;
	imageUrl?: string;
	dimAmount?: number; // Alpha for the dim overlay (0.0 = no dim, 1.0 = completely dark)
	backgroundColor?: number; // Fallback color if no image
}

export class BackgroundRenderer {
	public container: PIXI.Container;
	private backgroundSprite: PIXI.Sprite | null = null;
	private backgroundGraphics: PIXI.Graphics | null = null;
	private dimOverlay: PIXI.Graphics;
	private config: BackgroundConfig;

	constructor(initialConfig: BackgroundConfig) {
		this.config = initialConfig;
		this.container = new PIXI.Container();
		this.container.label = "BackgroundRenderer";

		// Create dim overlay graphics
		this.dimOverlay = new PIXI.Graphics();
		this.container.addChild(this.dimOverlay);

		this.draw();
	}

	private async draw(): Promise<void> {
		// Clear existing background
		this.clearBackground();

		if (this.config.imageUrl) {
			try {
				// Load and create sprite from the image URL
				const texture = await PIXI.Assets.load(this.config.imageUrl);
				this.backgroundSprite = new PIXI.Sprite(texture);

				// Scale and position the sprite to cover the entire screen
				this.scaleToFit(this.backgroundSprite, this.config.screenWidth, this.config.screenHeight);

				// Add sprite to container (behind the dim overlay)
				this.container.addChildAt(this.backgroundSprite, 0);
			} catch (error) {
				console.warn('Failed to load background image:', this.config.imageUrl, error);
				this.drawFallbackBackground();
			}
		} else {
			this.drawFallbackBackground();
		}

		// Draw dim overlay
		this.drawDimOverlay();
	}

	private clearBackground(): void {
		if (this.backgroundSprite) {
			this.backgroundSprite.destroy();
			this.backgroundSprite = null;
		}
		if (this.backgroundGraphics) {
			this.backgroundGraphics.destroy();
			this.backgroundGraphics = null;
		}
	}

	private drawFallbackBackground(): void {
		this.backgroundGraphics = new PIXI.Graphics();
		this.backgroundGraphics.rect(0, 0, this.config.screenWidth, this.config.screenHeight);
		this.backgroundGraphics.fill({
			color: this.config.backgroundColor || 0x000000,
			alpha: 1
		});
		this.container.addChildAt(this.backgroundGraphics, 0);
	}

	private scaleToFit(sprite: PIXI.Sprite, targetWidth: number, targetHeight: number): void {
		// Calculate scale to cover the entire screen while maintaining aspect ratio
		const scaleX = targetWidth / sprite.texture.width;
		const scaleY = targetHeight / sprite.texture.height;
		const scale = Math.max(scaleX, scaleY); // Use max to ensure full coverage

		sprite.scale.set(scale);

		// Center the sprite
		sprite.x = (targetWidth - sprite.width) / 2;
		sprite.y = (targetHeight - sprite.height) / 2;
	}

	private drawDimOverlay(): void {
		this.dimOverlay.clear();

		const dimAmount = this.config.dimAmount || 0.3;
		if (dimAmount > 0) {
			this.dimOverlay.rect(0, 0, this.config.screenWidth, this.config.screenHeight);
			this.dimOverlay.fill({
				color: 0x000000,
				alpha: dimAmount
			});
		}
	}

	public async updateConfig(newConfig: BackgroundConfig): Promise<void> {
		const needsRedraw =
			this.config.imageUrl !== newConfig.imageUrl ||
			this.config.screenWidth !== newConfig.screenWidth ||
			this.config.screenHeight !== newConfig.screenHeight;

		this.config = newConfig;

		if (needsRedraw) {
			await this.draw();
		} else {
			// Just update the dim overlay if only dim amount changed
			this.drawDimOverlay();
		}
	}

	public async onResize(screenWidth: number, screenHeight: number): Promise<void> {
		await this.updateConfig({
			...this.config,
			screenWidth,
			screenHeight
		});
	}

	public setVisibility(visible: boolean): void {
		this.container.visible = visible;
	}

	public destroy(): void {
		this.clearBackground();
		this.container.destroy({ children: true, texture: true });
	}
} 