<script lang="ts">
	import { Application, Graphics } from 'pixi.js';
	import type { PageData } from './$types'; // PageData now includes metadata and chart

	let { data } = $props<{ data: PageData }>(); 

	let pixiApp = $state<Application | null>(null); // Use $state
	let canvasContainer: HTMLDivElement;
	let audioElement = $state<HTMLAudioElement | null>(null); // Use $state

	// Extract data for easier access
	const { songId, metadata, chart } = data;
	const audioSrc = `/songs/${songId}/${metadata.audioFilename}`;

	// Svelte 5: $effect for setup and teardown
	$effect(() => {
		let appInstance: Application | null = null; 
		let audioInstance: HTMLAudioElement | null = null;

		const initGameplay = async () => {
			if (!canvasContainer) return; 

			// --- PixiJS Setup ---
			try {
				appInstance = new Application();
				await appInstance.init({ background: '#18181b', resizeTo: canvasContainer });
				
				canvasContainer.innerHTML = ''; 
				canvasContainer.appendChild(appInstance.canvas);
				
				pixiApp = appInstance; 
				console.log('PixiJS Initialized');

				// --- Stage Setup ---
				const stageWidth = appInstance.screen.width;
				const stageHeight = appInstance.screen.height;

				const highwayWidthRatio = 0.6; // Use 60% of stage width for highway
				const highwayWidth = stageWidth * highwayWidthRatio;
				const laneWidth = highwayWidth / chart.lanes; // chart.lanes should be 4 for MVP
				const highwayX = (stageWidth - highwayWidth) / 2;

				// Draw Highway Background / Lane Separators
				const highwayGraphics = new Graphics();
				const laneColors = [0x2a2a2e, 0x3a3a3e]; // Use 2 colors, will alternate
				const lineThickness = 4; // Increased thickness for debug
				const lineColor = 0xffff00; // Bright yellow for debug

				// Explicitly fill each lane rectangle
				for (let i = 0; i < chart.lanes; i++) {
					highwayGraphics.beginFill(laneColors[i % laneColors.length], 0.8); // Use beginFill
					highwayGraphics.drawRect(highwayX + i * laneWidth, 0, laneWidth, stageHeight); // Use drawRect
					highwayGraphics.endFill(); // Use endFill
				}

				// appInstance.stage.addChild(highwayGraphics); // Add filled rects to stage

				// --- Create NEW Graphics object for lines --- 
				const lineGraphics = new Graphics();
				lineGraphics.lineStyle(lineThickness, lineColor); // Use lineStyle (still thick yellow for debug)

				// Draw lane separator lines
				for (let i = 1; i < chart.lanes; i++) {
					lineGraphics.moveTo(highwayX + i * laneWidth, 0);
					lineGraphics.lineTo(highwayX + i * laneWidth, stageHeight);
				}
				// Outer highway lines
				lineGraphics.moveTo(highwayX, 0);
				lineGraphics.lineTo(highwayX, stageHeight);
				lineGraphics.moveTo(highwayX + highwayWidth, 0);
				lineGraphics.lineTo(highwayX + highwayWidth, stageHeight);
				
				appInstance.stage.addChild(lineGraphics); // Add lines graphics to stage

				// Draw Hit Zone (Judgment Line)
				const hitZoneYRatio = 0.85; // Position hit zone 85% down the screen
				const hitZoneY = stageHeight * hitZoneYRatio;
				const hitZoneGraphics = new Graphics();
				hitZoneGraphics.stroke({ width: 4, color: 0xffffff, alpha: 0.9 }); // Thicker white line
				hitZoneGraphics.moveTo(highwayX, hitZoneY);
				hitZoneGraphics.lineTo(highwayX + highwayWidth, hitZoneY);
				appInstance.stage.addChild(hitZoneGraphics);

				console.log('Chart Data:', chart);
				
			} catch (error) {
				console.error("Failed to initialize PixiJS:", error);
				// Optionally stop here if Pixi fails
			}

			// --- Audio Setup ---
			try {
				audioInstance = new Audio(audioSrc);
				audioInstance.preload = 'auto'; // Suggest preloading
				audioElement = audioInstance; // Assign to component variable
				console.log('Audio Element Created:', audioSrc);
				
				// TODO: Add event listeners (onloadeddata, onended, etc.) if needed
				// TODO: Start playback? audioInstance.play(); (Likely after user interaction or countdown)
			} catch (error) {
				console.error("Failed to create Audio element:", error);
			}
		};

		initGameplay();

		// Cleanup function
		return () => {
			console.log('Cleaning up Gameplay (PixiJS & Audio)...');
			// Cleanup PixiJS
			const appToDestroy = pixiApp || appInstance;
			if (appToDestroy) {
				appToDestroy.destroy(true); 
			}
			pixiApp = null; 
			if(canvasContainer) canvasContainer.innerHTML = ''; 

			// Cleanup Audio
			const audioToClean = audioElement || audioInstance;
			if (audioToClean) {
				audioToClean.pause(); // Stop playback
				audioToClean.removeAttribute('src'); // Release resource
				audioToClean.load(); // Abort loading
			}
			audioElement = null;
			
			console.log('Cleanup Complete');
		};
	});

</script>

<svelte:head>
	<title>Playing {metadata.title} by {metadata.artist} - MUG</title> <!-- Use loaded metadata -->
</svelte:head>

<div>
	<h1 class="text-2xl font-bold mb-4">{metadata.title} - {metadata.artist}</h1> <!-- Use loaded metadata -->
	<p class="mb-2">Difficulty: <span class="font-mono text-purple-300">{chart.difficultyName}</span></p> <!-- Use loaded chart data -->
	<div bind:this={canvasContainer} class="relative aspect-video bg-gray-800 border border-gray-600 rounded shadow-inner overflow-hidden min-h-[400px]">
		{#if !pixiApp}
			<p class="absolute inset-0 flex items-center justify-center text-gray-400">Loading Gameplay...</p>
		{/if}
	</div>
	<!-- Placeholder for score, combo, etc. -->
</div> 