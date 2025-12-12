import { Sprite, Texture, BlurFilter, Graphics } from 'pixi.js';

function hexToRgba(hex: number, alpha: number): string {
	const r = (hex >> 16) & 255;
	const g = (hex >> 8) & 255;
	const b = hex & 255;
	return `rgba(${r},${g},${b},${alpha})`;
}

export class LaneIllumination extends Sprite {

	constructor(laneWidth: number, highwayHeight: number, illuminationColor: number = 0xffffff) {
		const gradientTexture = LaneIllumination.createGradientTexture(laneWidth, highwayHeight, illuminationColor);
		super(gradientTexture);


		this.alpha = 0; // Start hidden

		const blurFilter = new BlurFilter();
		blurFilter.blur = 8;
		this.filters = [blurFilter];
	}

	private static createGradientTexture(width: number, height: number, color: number): Texture {
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, width); // Ensure width is at least 1
		canvas.height = Math.max(1, height); // Ensure height is at least 1
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			console.error('Failed to get 2D context for gradient texture. Returning empty texture.');
			return Texture.EMPTY; // Use an empty texture as a fallback
		}

		const gradient = ctx.createLinearGradient(0, height, 0, 0); // Gradient from bottom to top
		gradient.addColorStop(0, hexToRgba(color, 0.7)); // Start color at bottom (e.g., 70% alpha)
		gradient.addColorStop(0.8, hexToRgba(color, 0.2)); // Mid-point fade
		gradient.addColorStop(1, hexToRgba(color, 0));   // End color at top (fully transparent)

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		return Texture.from(canvas);
	}

	public show(): void {
		this.alpha = 1;
	}

	public hide(): void {
		this.alpha = 0;
	}

	public updatePosition(x: number, y: number): void {
		this.position.set(x, y);
	}

	public updateIlluminationColor(newColor: number): void {
		// this.baseIlluminationColor = newColor;
		// this.texture = LaneIllumination.createGradientTexture(this.laneWidth, this.highwayHeight, newColor);
		// The texture needs to be updated if color changes. 
		// For simplicity, this is commented out. If dynamic color changes are needed, 
		// this requires careful handling of texture updates and potentially CachingAsBitmap for performance.
	}
} 