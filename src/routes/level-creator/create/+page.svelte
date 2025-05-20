<script lang="ts">
	import { onMount } from 'svelte';
	// import LevelEditorHighway from '$lib/components/LevelEditorHighway.svelte'; // Remove this import
	import type { SongData, ChartData } from '$lib/game/types';
	//import { setupLevelEditorVisuals } from '$lib/leveleditor'; // Import the new function
	import * as PIXI from 'pixi.js'; // Import PIXI
	import { Application, Graphics, Container } from 'pixi.js'; // Import PIXI components

	// Define the types for the functions returned by setupLevelEditorVisuals
	type CleanupFn = () => void;
	type ResizeFn = (newWidth: number, newHeight: number) => void;

	let musicFile: File | null = $state(null);
	let musicErrorMessage = $state<string | null>(null);
	let musicFileInput: HTMLInputElement;
	let isMusicDragging = $state(false);
	let musicFileReady = $state(false);
	let audioUrl: string | null = $state(null);

	let levelEditorTrackDiv: HTMLDivElement;
	let levelEditorHeading: HTMLHeadingElement | null;

	// State variables updated by ResizeObserver
	let divWidth = $state(0);
	let divHeight = $state(0);

	// Declare song and chart data, initialized after music upload
	let songData: SongData | null = $state(null);
	let chartData: ChartData | null = $state(null);

	// PIXI variables declared here to manage their lifecycle
	let app: PIXI.Application | null = null;
	let highwayGraphics: PIXI.Graphics | null = null;
	let mainContainer: PIXI.Container | null = null;
	let canvasElement: HTMLCanvasElement | null = null;

	// ResizeObserver variable
	let resizeObserver: ResizeObserver | null = null;


	function handleMusicDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isMusicDragging = true;
	}

	function handleMusicDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isMusicDragging = false;
	}

	function handleMusicDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isMusicDragging = false;
		musicErrorMessage = null;

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		if (!file.type.startsWith('audio/')) {
			musicErrorMessage = 'Please drop a valid audio file';
			return;
		}

		musicFile = file;
		prepareMusicFile(file);
	}

	function handleMusicFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const file = input.files[0];
		if (!file.type.startsWith('audio/')) {
			musicErrorMessage = 'Please select a valid audio file';
			return;
		}

		musicFile = file;
		prepareMusicFile(file);
	}

	function triggerMusicFileInput() {
		musicFileInput.click();
	}

	function prepareMusicFile(file: File) {
		if (audioUrl) {
			URL.revokeObjectURL(audioUrl); // Clean up previous URL
		}
		const newAudioUrl = URL.createObjectURL(file);
		audioUrl = newAudioUrl;
		musicFileReady = true;

		// Initialize song and chart data after music file is ready
		const songId = `song-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
		songData = {
			id: songId,
			title: file.name,
			artist: 'Unknown Artist',
			// genre: 'Unknown Genre', // Removed as per types.ts
			// BPM: 120, // Removed as per types.ts
			audioUrl: newAudioUrl,
			// coverUrl?: string; // Optional
			durationMs: 0, // Placeholder (in milliseconds)
			// previewStartMs?: number; // Optional
		};

		chartData = {
			songId: songId, // Link to the song data
			difficultyName: 'Easy', // Placeholder difficulty
			// difficultyLevel?: number; // Optional
			numLanes: 4,
			noteScrollSpeed: 1.0, // Added as per types.ts (using a default value)
			notes: [/* Add placeholder notes here if needed for initial rendering */],
			timing: {
				bpms: [{ time: 0, bpm: 120 }], // time in seconds, bpm number
				stops: [], // time in seconds, duration in seconds
				delays: [], // time in seconds, duration in seconds
				beats: [] // time in ms, type 'downbeat' | 'subdivision'
			}
			// Add other chart-specific metadata like chart author, description, etc.
		};

		// Note: In a real editor, you'd parse/generate chart data here based on the music
	}

	// Function to draw/update highway lanes
	function drawHighwayLanes(app: PIXI.Application | null, mainContainer: PIXI.Container | null, highwayGraphics: PIXI.Graphics | null, chartData: ChartData | null, currentWidth: number, currentHeight: number) {
		console.log('drawHighwayLanes called', { app: !!app, mainContainer: !!mainContainer, chartData: !!chartData, currentWidth, currentHeight });
		if (!app || !mainContainer || !chartData) {
			console.warn('drawHighwayLanes: Dependencies not met.');
			return;
		}

		// Clear previous graphics if they exist
		if (highwayGraphics) {
			mainContainer.removeChild(highwayGraphics);
			highwayGraphics.destroy();
		}

		// Create new graphics for the highway
		highwayGraphics = new PIXI.Graphics();
		mainContainer.addChild(highwayGraphics);

		const numLanes = chartData.numLanes || 4;
		const totalHighwayWidth = currentWidth;
		const laneWidth = totalHighwayWidth / numLanes;

		// Draw lane lines - using setStrokeStyle as drawLine is deprecated in PIXI v8+
		for (let i = 0; i <= numLanes; i++) {
			const x = laneWidth * i;
			highwayGraphics.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.5 }); // White line, semi-transparent
			highwayGraphics.moveTo(x, 0);
			highwayGraphics.lineTo(x, currentHeight);
		}

		// Draw highway boundary - using rect as drawRect is deprecated in PIXI v8+
		highwayGraphics.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 1 }); // Solid white line
		highwayGraphics.rect(0, 0, totalHighwayWidth, currentHeight);
		highwayGraphics.stroke(); // Apply the stroke

		console.log('Highway lanes drawn/updated.', { totalHighwayWidth, laneWidth });
	}

	// Effect to set up the ResizeObserver
	$effect(() => {
		console.log('$effect (Observer Setup) triggered:', { levelEditorTrackDiv: !!levelEditorTrackDiv, musicFileReady, songData: !!songData, chartData: !!chartData, resizeObserver: !!resizeObserver });

		// If the necessary elements and data are available and the ResizeObserver hasn't been created yet, create it.
		if (levelEditorTrackDiv && musicFileReady && songData && chartData && !resizeObserver) {
			console.log('Observer Setup: Dependencies met. Creating ResizeObserver.');

			resizeObserver = new ResizeObserver(entries => {
				console.log('ResizeObserver callback triggered.');
				for (const entry of entries) {
					const currentWidth = entry.contentRect.width;
					const currentHeight = entry.contentRect.height;
					const headingHeight = levelEditorHeading?.offsetHeight || 0;
					const availableHeight = currentHeight - headingHeight;

					console.log(`ResizeObserver: Setting state variables ${currentWidth}x${availableHeight}`);

					// Update state variables. This will trigger the PIXI setup effect.
					divWidth = currentWidth;
					divHeight = availableHeight;
				}
			});

			// Observe the main container div
			resizeObserver.observe(levelEditorTrackDiv);
			console.log('Observer Setup: ResizeObserver attached.');
		}

		// Cleanup for this effect: disconnect the observer
		return () => {
			console.log('$effect (Observer Setup) cleanup running.');
			if (resizeObserver) {
				resizeObserver.disconnect();
				resizeObserver = null;
				console.log('ResizeObserver disconnected.');
			}
		};
	});

	// Effect to initialize and manage PIXI application
	$effect(() => {
		console.log('$effect (PIXI Setup) triggered:', { divWidth, divHeight, songData: !!songData, chartData: !!chartData, app: !!app });

		// Only initialize PIXI if dimensions are valid, data is ready, and PIXI is not yet initialized.
		if (divWidth > 0 && divHeight > 0 && songData && chartData && !app) {
			console.log('PIXI Setup: Dependencies met. Initializing PIXI.');
			try {
				// Find the flex-grow div to append the canvas to
				const flexGrowDiv = levelEditorTrackDiv?.querySelector('.flex-grow');
				if (!flexGrowDiv) {
					console.error('PIXI Setup: Could not find flex-grow div to append canvas.');
					// Critical error, stop initialization
					return;
				}
				console.log('PIXI Setup: Found flex-grow div.', flexGrowDiv);


				// Create and append canvas
				canvasElement = document.createElement('canvas');
				canvasElement.style.width = `${divWidth}px`;
				canvasElement.style.height = `${divHeight}px`;
				canvasElement.style.backgroundColor = 'rgba(100, 149, 237, 0.5)'; // Debug background

				flexGrowDiv.appendChild(canvasElement);
				console.log('PIXI Setup: Appended canvasElement.', canvasElement);


				// Initialize PIXI application
				const pixiApp = new PIXI.Application();
				// Use await for init
				pixiApp.init({
					canvas: canvasElement,
					width: divWidth,
					height: divHeight,
					backgroundColor: 0x1a1a1a, // Dark grey background for highway area
					backgroundAlpha: 1,
					antialias: true,
					resolution: window.devicePixelRatio || 1,
					autoDensity: true,
				}).then(() => {
					// This block runs after pixiApp.init() is successful
					console.log('PIXI Setup: PIXI application initialized successfully.');
					app = pixiApp; // Assign to variable

					// Create and add main container
					mainContainer = new PIXI.Container();
					app!.stage.addChild(mainContainer); // Use app! as it's guaranteed to be initialized here

					// Draw initial highway lanes
					drawHighwayLanes(app, mainContainer, highwayGraphics, chartData, divWidth, divHeight);

				}).catch((error: any) => {
					console.error('PIXI Setup: Error during PIXI initialization:', error);
					// Display error message to user
					if (levelEditorTrackDiv) {
						levelEditorTrackDiv.innerHTML = '<p style="color: red;">Error setting up level editor visuals.</p>';
					}
					// Attempt to clean up any resources that might have been created
					// Cleanup is also handled by the effect's return function if 'app' was assigned before the error
				});


			} catch (error: any) {
				console.error('PIXI Setup: Error during PIXI setup (sync part):', error);
				// Display error message to user
				if (levelEditorTrackDiv) {
					levelEditorTrackDiv.innerHTML = '<p style="color: red;">Error setting up level editor visuals.</p>';
				}
				// Attempt to clean up any resources that might have been created
				// Cleanup is also handled by the effect's return function
			}
		} else if (app && divWidth > 0 && divHeight > 0) {
			// If app is already initialized and dimensions change, handle resize
			console.log('PIXI Setup: App already initialized. Handling resize only.');
			// Resize the PIXI renderer
			app.renderer.resize(divWidth, divHeight);

			// Update canvas element style size
			if (canvasElement) {
				canvasElement.style.width = `${divWidth}px`;
				canvasElement.style.height = `${divHeight}px`;
			}

			// Redraw highway lanes with new dimensions
			drawHighwayLanes(app, mainContainer, highwayGraphics, chartData, divWidth, divHeight);

			console.log(`PIXI Setup: Level editor visuals resized to ${divWidth}x${divHeight}`);

		} else if (app && (divWidth <= 0 || divHeight <= 0 || !songData || !chartData)) {
             // If app exists but dependencies are no longer met (e.g., user uploads new music)
             console.log('PIXI Setup: Dependencies no longer met for existing app. Triggering cleanup.');
             // The cleanup function returned by the effect handles disposing resources
             app.destroy(true, { children: true, texture: true }); // Explicitly destroy to trigger cleanup logic below
             app = null; // Clear reference
        }


		// Cleanup function for this effect - specifically for PIXI resources
		return () => {
			console.log('$effect (PIXI Setup) cleanup running.');
			if (app) {
				console.log('Destroying PIXI application.');
				app.destroy(true, { children: true, texture: true });
				app = null;
				console.log('PIXI application destroyed.');
			}
			// Remove the canvas element from the DOM if it exists and has a parent
			if (canvasElement && canvasElement.parentNode) {
				console.log('Removing canvas element from parent node.', canvasElement.parentNode);
				canvasElement.parentNode.removeChild(canvasElement);
				canvasElement = null;
				console.log('Canvas element removed.');
			} else if (canvasElement) {
                 console.warn('Canvas element exists but has no parent node to remove from.');
                 canvasElement = null;
            }
			highwayGraphics = null;
			mainContainer = null;
			console.log('PIXI related variables cleared.');
		};
	});

	onMount(() => {
		// onMount cleanup for audioUrl
		return () => {
			console.log('onMount cleanup (audioUrl) running.');
			if (audioUrl) {
				URL.revokeObjectURL(audioUrl);
				console.log('Audio URL revoked.');
			}
			// PIXI cleanup is now handled by the $effect cleanup
		};
	});


</script>

<svelte:head>
	<title>Create New Level - MUG</title>
</svelte:head>

<div class="flex flex-col h-full pt-8 isolate">
	<div class="w-full max-w-4xl mx-auto px-4">
		<h1 class="text-4xl font-bold mb-10 text-gray-200 text-center">Create New Level</h1>

		<div class="grid grid-cols-1 gap-6">

			{#if !musicFileReady}
			<!-- Upload Music Section -->
			<div
				class="group block bg-gradient-to-r from-green-500 to-teal-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out"
			>
				<h2 class="text-3xl font-bold text-white mb-1 group-hover:text-green-200 transition-colors flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 512 512"
						class="w-8 h-8 mr-3"
						fill="currentColor"
					>
						<path d="M464 256A208 208 0 1 0 256 464a208 208 0 1 0 0-416zm0 256A256 256 0 1 1 256 0a256 256 0 1 1 0 512zM256 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm96 96V352c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32 14.3 32 32zM192 192v128h96V192H192z"></path></svg>
					Upload Music
				</h2>
				<p class="text-md text-teal-100 mb-4">Upload an audio file for your custom level</p>

				<input
					type="file"
					accept="audio/*"
					class="hidden"
					bind:this={musicFileInput}
					on:change={handleMusicFileSelect}
				/>

				<div
					class="border-2 border-dashed border-white/30 rounded-lg p-8 text-center transition-colors cursor-pointer {isMusicDragging
						? 'border-green-200 bg-green-500/20'
						: 'hover:border-green-200'}"
					on:dragover={handleMusicDragOver}
					on:dragleave={handleMusicDragLeave}
					on:drop={handleMusicDrop}
					on:click={triggerMusicFileInput}
				>
					{#if !musicFile}
						<p class="text-white/80">
							Drag and drop your music file here<br />
							or click to select a file
						</p>
					{:else}
						<p class="text-white/80">
							File loaded: {musicFile.name}
						</p>
					{/if}
				</div>

				{#if musicErrorMessage}
					<p class="text-red-200 mt-2 text-sm">{musicErrorMessage}</p>
				{/if}
			</div>
			{:else}
			<!-- Music Player Section -->
			<div
				class="group block bg-gradient-to-r from-blue-500 to-purple-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out"
			>
				<h2 class="text-3xl font-bold text-white mb-4 flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-8 h-8 mr-3" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24v80c0 13.3 10.7 24 24 24h0c13.3 0 24-10.7 24-24V288h8c13.3 0 24-10.7 24-24V224c0-13.3-10.7-24-24-24h-96V160c0-13.3-10.7-24-24-24h0c-13.3 0-24 10.7-24 24v48h-8c-13.3 0-24 10.7-24 24v32c0 13.3 10.7 24 24 24zm80-80V192h32v64H296zm-80 0v-32h32v32h-32z"></path></svg>
					Now Playing: {musicFile?.name}
				</h2>
				{#if audioUrl}
					<audio controls src="{audioUrl}" class="w-full"></audio>
				{/if}
			</div>

			<!-- Level Editor Track Section Placeholder -->
			{#if musicFileReady}
			<div
				class="group block bg-gradient-to-r from-orange-500 to-red-600 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out mt-6 h-170 overflow-y-auto flex flex-col"
				bind:this={levelEditorTrackDiv}
			>
				<h2 class="text-3xl font-bold text-white mb-4 flex items-center" bind:this={levelEditorHeading}>
					Level Editor Track (Coming Soon)
				</h2>
				{#if divWidth > 0 && divHeight > 0 && songData && chartData}
					<!-- The level editor visuals will be rendered here -->
					<div class="flex-grow">
						<!-- PIXI canvas will be appended here -->
					</div>
				{/if}
			</div>
			{/if}

			{/if}

		</div>
		<!-- You can add more sections here -->

	</div>

</div> 