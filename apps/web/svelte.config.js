import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-auto";
// import adapter from "svelte-adapter-bun"; 


/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		// alias: {
		// 	"@mug/db": "../../packages/db/src/index.ts",
		// 	"@mug/contract": "../../packages/contract/src/index.ts",
		// 	"@mug/game-logic": "../../packages/game-logic/src/index.ts",
		// },
	},
};

export default config;
