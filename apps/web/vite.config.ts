import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import  { resolve } from "node:path";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		fs: {
			// Allow workspace packages to be served during dev (e.g. @mug/contract)
			allow: [resolve(__dirname, "."), resolve(__dirname, "../../packages")],
		},
	},
	resolve: {
		alias: [
			// Stub pixi.js for SSR builds (browser-only library)
			{
				find: "pixi.js",
				replacement: resolve(__dirname, "src/lib/ssr-stubs/pixi-stub.ts"),
			},
			{
				find: "@pixi/sound",
				replacement: resolve(__dirname, "src/lib/ssr-stubs/pixi-sound-stub.ts"),
			},
		],
	},
	ssr: {
		// Externalize browser-only dependencies for SSR builds
		external: ["pixi.js", "@pixi/sound"],
	},
});
