import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		fs: {
			// Allow workspace packages to be served during dev (e.g. @mug/contract)
			allow: [resolve(__dirname, "."), resolve(__dirname, "../../packages")],
		},
	},
	ssr: {
		// Externalize client-only libraries during SSR build
		noExternal: ["@mug/engine"], // Bundle @mug/engine but externalize its dependencies
		external: ["pixi.js", "@pixi/sound"], // These are client-only and shouldn't be in SSR
	},
});
