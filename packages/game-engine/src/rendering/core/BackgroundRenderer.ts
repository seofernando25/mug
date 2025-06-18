import type { Atom } from 'nanostores';
import { atom, computed, effect, task } from 'nanostores';
import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';

export class BackgroundRenderer extends Container {
	private cleanup: (() => void)[] = [];
	imageUrl = atom<string | undefined>(undefined);
	dimAmount = atom(0.3);
	fallbackColor = atom(0x000000);

	constructor(
		private screenWidth: Atom<number>,
		private screenHeight: Atom<number>,
	) {
		super();
		const cleanup: (() => void)[] = [];


		this.label = "BackgroundRenderer";


		// const texture = await Assets.load(imageUrl);
		let imageTexture = computed(this.imageUrl, (imageUrl) => task(async () => {
			if (imageUrl) {
				const texture = await Assets.load<Texture>(imageUrl);
				console.log('BackgroundRenderer: Loaded image texture:', imageUrl);
				return texture;
			}
			return undefined;
		}));
		
		const backgroundSprite = new Sprite();
		backgroundSprite.label = "BackgroundSprite";
		this.addChild(backgroundSprite);
		cleanup.push(() => {
			backgroundSprite.destroy();
		});

		cleanup.push(effect([imageTexture], (texture) => {
			if (texture ) {
				backgroundSprite.texture = texture;
			}
		}));
		
		cleanup.push(effect([this.screenWidth, this.screenHeight, imageTexture], (width, height, texture) => {
		
			if (!texture) return;

			const scaleX = width / texture.width;
			const scaleY = height / texture.height;
			const scale = Math.max(scaleX, scaleY);
			backgroundSprite.scale.set(scale);
			backgroundSprite.x = (width - backgroundSprite.width) / 2;
			backgroundSprite.y = (height - backgroundSprite.height) / 2;
		}));
		
	
		// Fallback background
		const backgroundGraphics = new Graphics();
		backgroundGraphics.label = "SolidBackground";
		this.addChildAt(backgroundGraphics, 0);
		cleanup.push(() => {
			backgroundGraphics.destroy();
		});

		cleanup.push(effect([this.screenWidth, this.screenHeight, this.fallbackColor], (width, height, color) => {
			backgroundGraphics.clear();
			backgroundGraphics.rect(0, 0, width, height);
			backgroundGraphics.fill({
				color: color,
				alpha: 1
			});
		}));

		// Create dim overlay graphics
		const dimOverlay = new Graphics();
		dimOverlay.label = "DimOverlay";
		this.addChild(dimOverlay);
		cleanup.push(() => {
			dimOverlay.destroy();
		});

		cleanup.push(effect([this.screenWidth, this.screenHeight, this.dimAmount], (width, height, dimAmount) => {
			dimOverlay.clear();
			dimOverlay.rect(0, 0, width, height);
			dimOverlay.fill({
				color: 0x000000,
				alpha: dimAmount
			});
		}));
	}

	
	public destroy(): void {
		super.destroy({ children: true, texture: true });

		for (const cleanup of this.cleanup) {
			cleanup();
		}
	}
} 