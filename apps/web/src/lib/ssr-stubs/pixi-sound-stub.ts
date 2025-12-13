// Stub for @pixi/sound during SSR builds
// This file is only used during server-side rendering
// The actual @pixi/sound will be used in the browser

export const Sound = {
	from: () => ({
		play: () => {},
		stop: () => {},
		pause: () => {},
		resume: () => {},
		volume: 1,
		loaded: false,
	}),
} as any;

export type IMediaInstance = any;

