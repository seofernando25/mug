import type { Atom } from 'nanostores';
import { atom, computed, effect, task } from 'nanostores';
import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';

const backgroundFallbackColor = atom(0x000000);
const backgroundDimAmount = atom(0.3);


export const backgroundRendererFactory = (ctx: {
	screenSize: Atom<{ width: number, height: number }>,
	imageUrl: Atom<string | undefined>,
}) => {
	const cleanup: (() => void)[] = [];

	const container = new Container();
	container.label = "BackgroundRenderer";

	let imageTexture = computed(ctx.imageUrl, (imageUrl) => task(async () => {
		if (imageUrl) {
			const texture = await Assets.load<Texture>(imageUrl);
			console.log('BackgroundRenderer: Loaded image texture:', imageUrl);
			return texture;
		}
		return undefined;
	}));
	
	const backgroundSprite = new Sprite();
	backgroundSprite.label = "BackgroundSprite";
	container.addChild(backgroundSprite);
	cleanup.push(() => {
		backgroundSprite.destroy();
	});

	cleanup.push(effect([imageTexture], (texture) => {
		if (texture ) {
			backgroundSprite.texture = texture;
		}
	}));
	
	cleanup.push(effect([ctx.screenSize, imageTexture], (screenSize, texture) => {
	
		if (!texture) return;

		const scaleX = screenSize.width / texture.width;
		const scaleY = screenSize.height / texture.height;
		const scale = Math.max(scaleX, scaleY);
		backgroundSprite.scale.set(scale);
		backgroundSprite.x = (screenSize.width - backgroundSprite.width) / 2;
		backgroundSprite.y = (screenSize.height - backgroundSprite.height) / 2;
	}));
	

	// Fallback background
	const backgroundGraphics = new Graphics();
	backgroundGraphics.label = "SolidBackground";
	container.addChildAt(backgroundGraphics, 0);
	cleanup.push(() => {
		backgroundGraphics.destroy();
	});

	cleanup.push(effect([ctx.screenSize, backgroundFallbackColor], (screenSize, color) => {
		backgroundGraphics.clear();
		backgroundGraphics.rect(0, 0, screenSize.width, screenSize.height);
		backgroundGraphics.fill({
			color: color,
			alpha: 1
		});
	}));

	// Create dim overlay graphics
	const dimOverlay = new Graphics();
	dimOverlay.label = "DimOverlay";
	container.addChild(dimOverlay);
	cleanup.push(() => {
		dimOverlay.destroy();
	});

	cleanup.push(effect([ctx.screenSize, backgroundDimAmount], (screenSize, dimAmount) => {
		dimOverlay.clear();
		dimOverlay.rect(0, 0, screenSize.width, screenSize.height);
		dimOverlay.fill({
			color: 0x000000,
			alpha: dimAmount
		});
	}));

	cleanup.push(() => {
		container.destroy();

	});
	
	container.on("destroyed", () =>  cleanup.forEach(cleanup => cleanup()));

	return container;
}