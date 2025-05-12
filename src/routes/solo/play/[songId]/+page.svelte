<script lang="ts">
	export const ssr = false;

	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import { Application } from 'pixi.js';

	export let data: PageData;

	let pixiApp: Application | null = null;
	let canvasContainer: HTMLDivElement;

	onMount(() => {
		pixiApp = new Application();
		pixiApp.init({ background: '#18181b', resizeTo: canvasContainer });
		canvasContainer.appendChild(pixiApp.canvas);

		return () => {
			if (pixiApp) {
				pixiApp.destroy(true);
				pixiApp = null;
			}
		};
	});
</script>

<svelte:head>
	<title>Playing {data.songId} - MUG</title>
</svelte:head>

<div>
	<p class="mb-2">Now Playing: <span class="font-mono text-purple-300">{data.songId}</span></p>
	<div bind:this={canvasContainer} class="aspect-video bg-gray-700 border border-gray-600 rounded shadow-inner flex items-center justify-center min-h-[400px]">
		<!-- PixiJS canvas will be appended here -->
		<p class="p-4 text-center text-gray-400">Gameplay Area</p>
	</div>
	<!-- Placeholder for score, combo, etc. -->
</div> 