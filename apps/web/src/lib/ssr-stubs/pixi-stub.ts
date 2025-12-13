// Stub for pixi.js during SSR builds
// This file is only used during server-side rendering
// The actual pixi.js will be used in the browser

export const Application = class {
	init() {
		return Promise.resolve();
	}
} as any;

export const Container = class {} as any;

export const Graphics = class {} as any;

export const Sprite = class {} as any;

export const Texture = class {} as any;

export const Text = class {} as any;

export const TextStyle = class {} as any;

export const BlurFilter = class {} as any;

