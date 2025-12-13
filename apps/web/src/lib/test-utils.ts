// Test utilities for setting up SvelteKit mocks
// Import this in test files that need SvelteKit virtual module mocking

import { mock } from "bun:test";

export function setupSvelteKitMocks() {
	// Mock $app/environment - Prevents settingsStore import failure
	mock.module("$app/environment", () => ({
		browser: true,
		dev: true,
		building: false,
		version: "test",
	}));

	// Mock $app/navigation
	mock.module("$app/navigation", () => ({
		goto: mock(() => Promise.resolve()),
		invalidate: mock(() => Promise.resolve()),
		invalidateAll: mock(() => Promise.resolve()),
		preloadData: mock(() => Promise.resolve()),
		preloadCode: mock(() => Promise.resolve()),
		beforeNavigate: mock(),
		afterNavigate: mock(),
	}));

	// Mock $app/stores
	mock.module("$app/stores", () => {
		const { readable } = require("svelte/store");
		return {
			page: readable({
				url: new URL("http://localhost"),
				params: {},
				route: { id: null },
				status: 200,
				error: null,
				data: {},
			}),
			navigating: readable(null),
			updated: readable(false),
		};
	});

	// Mock localStorage
	if (!global.localStorage) {
		global.localStorage = {
			getItem: mock(() => null),
			setItem: mock(() => {}),
			removeItem: mock(() => {}),
			clear: mock(() => {}),
			length: 0,
			key: mock(() => null),
		} as Storage;
	}

	// Mock DOM APIs
	if (typeof window === "undefined") {
		global.document = {
			createElement: mock((_tagName: string) => ({
				style: {},
				classList: {
					add: mock(),
					remove: mock(),
					contains: mock(() => false),
				},
				appendChild: mock(),
				removeChild: mock(),
				addEventListener: mock(),
				removeEventListener: mock(),
			})),
			addEventListener: mock(),
			removeEventListener: mock(),
			querySelector: mock(() => null),
			querySelectorAll: mock(() => []),
			createElementNS: mock(() => ({})),
			body: {},
		} as unknown as Document;

		global.window = {
			localStorage: global.localStorage,
			document: global.document,
			addEventListener: mock(),
			removeEventListener: mock(),
			requestAnimationFrame: mock(() => 1),
			cancelAnimationFrame: mock(),
			setTimeout: mock((cb, delay) => setTimeout(cb, delay || 0)),
			clearTimeout: mock(),
			setInterval: mock((cb, delay) => setInterval(cb, delay || 0)),
			clearInterval: mock(),
			navigator: { userAgent: "Bun/Test" },
		} as unknown as Window & typeof globalThis;

		global.navigator = global.window.navigator;
		global.requestAnimationFrame = global.window.requestAnimationFrame;
		global.cancelAnimationFrame = global.window.cancelAnimationFrame;
		global.setTimeout = global.window.setTimeout;
		global.clearTimeout = global.window.clearTimeout;
		global.setInterval = global.window.setInterval;
		global.clearInterval = global.window.clearInterval;
	}
}

export function restoreMocks() {
	mock.restore();
}
