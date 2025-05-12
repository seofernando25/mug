<script lang="ts">
	import { Application } from 'pixi.js';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>(); // Use Svelte 5 $props

	let pixiApp: Application | null = null;
	let canvasContainer: HTMLDivElement;

	// Svelte 5: $effect for setup and teardown
	$effect(() => {
		let appInstance: Application | null = null; // Local instance for async handling

		const initPixi = async () => {
			if (!canvasContainer) return; // Ensure container element exists

			try {
				appInstance = new Application();
				await appInstance.init({ background: '#18181b', resizeTo: canvasContainer });
				
				// Clear container before appending (important for HMR)
				canvasContainer.innerHTML = ''; 
				canvasContainer.appendChild(appInstance.canvas);
				
				pixiApp = appInstance; // Assign to component variable *after* successful init
				console.log('PixiJS Initialized');

				// --- TODO: Add PixiJS stage setup logic here --- 
				
			} catch (error) {
				console.error("Failed to initialize PixiJS:", error);
			}
		};

		initPixi();

		// Cleanup function
		return () => {
			console.log('Cleaning up PixiJS app...');
			// Use the local appInstance captured by the closure if pixiApp wasn't assigned or was cleared
			const appToDestroy = pixiApp || appInstance;
			if (appToDestroy) {
				appToDestroy.destroy(true); // destroy(true) removes canvas from DOM
				console.log('PixiJS Destroyed');
			}
			pixiApp = null; // Ensure component variable is cleared
			// Explicitly clear container as destroy might not always remove it instantly on HMR
			if(canvasContainer) canvasContainer.innerHTML = ''; 
		};
	});

</script>

<svelte:head>
	<title>Playing {data.songId} - MUG</title>
</svelte:head>

<div>
	<h1 class="text-2xl font-bold mb-4">Gameplay Screen</h1>
	<p class="mb-2">Now Playing: <span class="font-mono text-purple-300">{data.songId}</span></p>
	<div bind:this={canvasContainer} class="relative aspect-video bg-gray-800 border border-gray-600 rounded shadow-inner overflow-hidden min-h-[400px]">
		<!-- PixiJS canvas will be appended here replacing this placeholder -->
		{#if !pixiApp}
			<p class="absolute inset-0 flex items-center justify-center text-gray-400">Loading Gameplay...</p>
		{/if}
	</div>
	<!-- Placeholder for score, combo, etc. -->
</div> 