<script lang="ts">
	import { Application, Graphics } from 'pixi.js';
	import type { PageData } from './$types'; // PageData now includes metadata and chart

	let { data } = $props<{ data: PageData }>(); 

	let pixiApp = $state<Application | null>(null); // Use $state
	let canvasContainer: HTMLDivElement;
	let audioElement = $state<HTMLAudioElement | null>(null); // Use $state
	let beatLines = $state<Graphics[]>([]); // Store active beat line Graphics objects
	let timeSinceLastBeat = $state(0); // Time accumulator for beat spawning

	type ActiveNote = {
		id: number; // Index from original chart.notes
		lane: number;
		time: number;
		type: 'tap' | 'hold';
		duration?: number;
		headGraphics: Graphics;
		bodyGraphics?: Graphics; // For hold notes
	}; 
	let activeNotes = $state<ActiveNote[]>([]); // Store notes currently on screen
	let currentNoteIndex = $state(0); // Track next note to spawn from chart
	let songTime = $state(0); // Elapsed time in ms

	const scrollSpeed = $state(300); // Pixels per second notes/lines travel down

	// Extract data for easier access
	const { songId, metadata, chart } = data;
	const audioSrc = `/songs/${songId}/${metadata.audioFilename}`;

	// Svelte 5: $effect for setup and teardown
	$effect(() => {
		let appInstance: Application | null = null; 
		let audioInstance: HTMLAudioElement | null = null;
		let gameLoop: ((ticker: any) => void) | null = null; // Store ticker callback for removal

		// Graphics objects that need updating on resize
		let highwayGraphics: Graphics | null = null;
		let lineGraphics: Graphics | null = null;
		let hitZoneGraphics: Graphics | null = null;

		// Function to calculate layout and redraw static elements
		const updateLayout = () => {
			if (!pixiApp || !highwayGraphics || !lineGraphics || !hitZoneGraphics) return;

			const app = pixiApp;
			const stageWidth = app.screen.width;
			const stageHeight = app.screen.height;

			// Recalculate dimensions
			const highwayWidthRatio = 0.6;
			const highwayWidth = stageWidth * highwayWidthRatio;
			const laneWidth = highwayWidth / chart.lanes; 
			const highwayX = (stageWidth - highwayWidth) / 2;
			const hitZoneYRatio = 0.85;
			const hitZoneY = stageHeight * hitZoneYRatio;
			const hitZoneHeight = 4;
			const lineThickness = 2;
			const lineColor = 0x888888; 
			const laneColors = [0x2a2a2e, 0x3a3a3e];
			const hitZoneColor = 0xffffff;
			const hitZoneAlpha = 0.9;
			const noteWidthRatio = 0.9; // Keep consistent with note spawning
			const beatLineHeight = 2;
			const beatLineColor = 0x555555;
			const beatLineAlpha = 0.7;

			// --- Redraw Highway Background ---
			highwayGraphics.clear();
			for (let i = 0; i < chart.lanes; i++) {
				highwayGraphics.rect(highwayX + i * laneWidth, 0, laneWidth, stageHeight)
							   .fill({ color: laneColors[i % laneColors.length], alpha: 0.8 });
			}

			// --- Redraw Highway Lines ---
			lineGraphics.clear();
			for (let i = 0; i < chart.lanes + 1; i++) {
				const lineX = highwayX + i * laneWidth;
				lineGraphics.rect(lineX - lineThickness / 2, 0, lineThickness, stageHeight)
							.fill({ color: lineColor });
			}

			// --- Redraw Hit Zone ---
			hitZoneGraphics.clear();
			hitZoneGraphics.rect(highwayX, hitZoneY - hitZoneHeight / 2, highwayWidth, hitZoneHeight)
						   .fill({ color: hitZoneColor, alpha: hitZoneAlpha });

			// --- Update existing beat line X positions and width ---
			beatLines.forEach(line => {
				line.clear(); // Clear old drawing
				line.rect(highwayX, -beatLineHeight / 2, highwayWidth, beatLineHeight)
					.fill({ color: beatLineColor, alpha: beatLineAlpha });
				// Y position is handled by game loop, only need to ensure width/x are correct
			});

			// --- Update existing note X positions and width ---
			activeNotes.forEach(note => {
				const noteVisualWidth = laneWidth * noteWidthRatio;
				const noteX = highwayX + (note.lane * laneWidth) + (laneWidth - noteVisualWidth) / 2;
				note.headGraphics.x = noteX;
				// If width needs to change (it does based on laneWidth)
				// We might need to redraw or scale. Redrawing is simpler for rects.
				// TODO: Re-evaluate if redrawing notes is too costly. Scaling might be better.
				
				if (note.bodyGraphics) {
					note.bodyGraphics.x = noteX;
					// Similarly, update body width if necessary
				}
			});
		};

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

				// Draw Highway Background (Using PixiJS v8 methods)
				highwayGraphics = new Graphics(); // Assign to variable
				const laneColors = [0x2a2a2e, 0x3a3a3e]; // Use 2 colors, will alternate
				const lineThickness = 2; // Slightly thinner default line
				const lineColor = 0x888888; // Lighter gray for lines

				// Fill each lane rectangle - MOVED TO updateLayout
				/* for (let i = 0; i < chart.lanes; i++) { ... } */

				appInstance.stage.addChild(highwayGraphics); // Add background rects to stage

				// Draw Highway Lines (Using PixiJS v8 methods)
				lineGraphics = new Graphics(); // Assign to variable
				// Draw lane separator lines as thin rectangles - MOVED TO updateLayout
				/* for (let i = 0; i < chart.lanes + 1; i++) { ... } */
				
				
				appInstance.stage.addChild(lineGraphics); // Add lines graphics to stage

				// Draw Hit Zone (Judgment Line) - Now using a rectangle
				/* const hitZoneYRatio = 0.85; ... */ // Dimensions calculated in updateLayout
				const hitZoneHeight = 4; // Height of the hit zone rectangle (was line width)
				const hitZoneColor = 0xffffff;
				const hitZoneAlpha = 0.9;

				hitZoneGraphics = new Graphics(); // Assign to variable
				// Drawing moved to updateLayout
				/* hitZoneGraphics.rect(...) */
				appInstance.stage.addChild(hitZoneGraphics);

				console.log('Chart Data:', chart);

				// --- Initial Layout Draw ---
				updateLayout(); 

				// --- Beat Line Setup ---
				const bpm = metadata.bpm > 0 ? metadata.bpm : 120; // Default to 120 if bpm is invalid
				const beatIntervalMs = (60 / bpm) * 1000;
				const beatLineHeight = 2;
				const beatLineColor = 0x555555;
				const beatLineAlpha = 0.7;
				timeSinceLastBeat = 0; // Reset on init
				beatLines = []; // Reset on init

				// --- Note Setup ---
				const lookaheadSeconds = 2.0; // How many seconds in advance notes appear
				const noteHeight = 20;
				const noteColorTap = 0x00ff00; // Green for tap
				const noteColorHoldHead = 0x00aaff; // Light blue for hold head
				const noteColorHoldBody = 0x0077cc; // Darker blue for hold body
				const noteWidthRatio = 0.9; // % of laneWidth

				// Ensure notes (hitObjects) are sorted by time (now in ms)
				const sortedHitObjects = [...(chart.hitObjects || [])].sort((a, b) => a.time - b.time);

				activeNotes = [];
				currentNoteIndex = 0;
				songTime = 0;

				gameLoop = (ticker) => {
					if (!appInstance) return; // Guard against race conditions during cleanup
					const deltaMs = ticker.deltaMS;
					const deltaSeconds = deltaMs / 1000;

					songTime += deltaMs; // Update song time

					// --- Move existing beat lines ---
					beatLines.forEach(line => {
						line.y += scrollSpeed * deltaSeconds;
					});

					// --- Despawn lines below screen ---
					const remainingLines: Graphics[] = [];
					beatLines.forEach(line => {
						// Check if the top edge of the line is below the stage
						if (line.y - beatLineHeight / 2 > stageHeight) { 
							appInstance?.stage.removeChild(line); // Use optional chaining
							line.destroy();
						} else {
							remainingLines.push(line);
						}
					});
					// Only update state if it actually changed to avoid infinite loops with $effect
					if (remainingLines.length !== beatLines.length) {
						beatLines = remainingLines; 
					}
					
					// --- Spawn new beat lines ---
					timeSinceLastBeat += deltaMs;
					while (timeSinceLastBeat >= beatIntervalMs) {
						 const newBeatLine = new Graphics();
						 newBeatLine.rect(highwayX, -beatLineHeight / 2, highwayWidth, beatLineHeight)
									.fill({ color: beatLineColor, alpha: beatLineAlpha });
						 newBeatLine.y = 0; // Start at the top of the stage
						 appInstance?.stage.addChild(newBeatLine); // Use optional chaining
						 // Update state by creating a new array
						 beatLines = [...beatLines, newBeatLine]; 
						 timeSinceLastBeat -= beatIntervalMs;
					}

					// --- Note Spawning, Movement, Despawning ---
					// 1. Spawn new notes

					// Get current dimensions needed for spawning calculations
					const currentStageWidth = pixiApp?.screen.width ?? 0;
					const currentStageHeight = pixiApp?.screen.height ?? 0;
					const currentHighwayWidthRatio = 0.6;
					const currentHighwayWidth = currentStageWidth * currentHighwayWidthRatio;
					const currentLaneWidth = currentHighwayWidth / chart.lanes;
					const currentHighwayX = (currentStageWidth - currentHighwayWidth) / 2;
					const currentHitZoneYRatio = 0.85;
					const currentHitZoneY = currentStageHeight * currentHitZoneYRatio;
					const currentNoteWidthRatio = 0.9;
					const currentNoteHeight = 20;

					while (currentNoteIndex < sortedHitObjects.length && 
						   sortedHitObjects[currentNoteIndex].time <= songTime + (lookaheadSeconds * 1000))
					{
						const noteData = sortedHitObjects[currentNoteIndex];
						const noteVisualWidth = currentLaneWidth * currentNoteWidthRatio;
						const noteX = currentHighwayX + (noteData.lane * currentLaneWidth) + (currentLaneWidth - noteVisualWidth) / 2;

						// Initial Y position relative to hit zone, notes appear at top and scroll down
						// noteData.time and songTime are in ms. scrollSpeed is in px/sec.
						const initialY = currentHitZoneY - ((noteData.time - songTime) / 1000 * scrollSpeed);
						
						const headGraphics = new Graphics();
						headGraphics.rect(0, 0, noteVisualWidth, currentNoteHeight)
								   .fill({ color: noteData.type === 'hold' ? noteColorHoldHead : noteColorTap });
						headGraphics.x = noteX;
						headGraphics.y = initialY;
						appInstance?.stage.addChild(headGraphics);

						let bodyGraphics: Graphics | undefined = undefined;
						if (noteData.type === 'hold' && noteData.duration && noteData.duration > 0) {
							// duration is in ms, scrollSpeed in px/sec
							const bodyHeight = (noteData.duration / 1000) * scrollSpeed; 
							bodyGraphics = new Graphics();
							bodyGraphics.rect(0, 0, noteVisualWidth, bodyHeight)
										 .fill({ color: noteColorHoldBody });
							bodyGraphics.x = noteX;
							bodyGraphics.y = initialY + currentNoteHeight; // Position body below the head
							appInstance?.stage.addChild(bodyGraphics);
						}

						activeNotes = [...activeNotes, {
							id: currentNoteIndex,
							lane: noteData.lane,
							time: noteData.time, // Already in ms
							type: noteData.type as 'tap' | 'hold',
							duration: noteData.duration, // Already in ms
							headGraphics,
							bodyGraphics
						}];
						currentNoteIndex++;
					}

					// 2. Move and update existing notes
					const notesToKeep: ActiveNote[] = [];
					activeNotes.forEach(note => {
						note.headGraphics.y += scrollSpeed * deltaSeconds;
						if (note.bodyGraphics) {
							note.bodyGraphics.y += scrollSpeed * deltaSeconds;
							// For hold notes, the tail should effectively shrink from the bottom as it passes the hit zone
							// This can be complex; for now, it just moves with the head.
							// A more accurate approach would involve masking or recalculating the body's height/y based on songTime.
						}

						// 3. Despawn notes that are way off-screen (e.g., hitZoneY + some buffer)
						const despawnBuffer = 200; // Pixels below hit zone to despawn
						if (note.headGraphics.y > stageHeight + despawnBuffer) { 
							appInstance?.stage.removeChild(note.headGraphics);
							note.headGraphics.destroy();
							if (note.bodyGraphics) {
								appInstance?.stage.removeChild(note.bodyGraphics);
								note.bodyGraphics.destroy();
							}
						} else {
							notesToKeep.push(note);
						}
					});
					if (notesToKeep.length !== activeNotes.length) {
						activeNotes = notesToKeep;
					}
				};

				appInstance.ticker.add(gameLoop);
				appInstance.renderer.on('resize', updateLayout); // Add resize listener
				
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
				
				// Autoplay the song
				audioInstance.play().catch(e => console.error("Error playing audio:", e));

				// TODO: Add event listeners (onloadeddata, onended, etc.) if needed
			} catch (error) {
				console.error("Failed to create Audio element:", error);
			}
		};

		initGameplay();

		// Cleanup function
		return () => {
			console.log('Cleaning up Gameplay (PixiJS, Audio & Beat Lines)...');
			const currentApp = pixiApp || appInstance; // Use the instance that was actually created

			// Cleanup Ticker (before destroying app)
			if (currentApp && gameLoop) {
				currentApp.ticker.remove(gameLoop);
				gameLoop = null; // Clear reference
			}
			// Cleanup Resize Listener
			if (currentApp) {
				currentApp.renderer.off('resize', updateLayout);
			}

			// Cleanup Beat Lines Graphics
			beatLines.forEach(line => {
				// Remove from stage first if app/stage still exist
				currentApp?.stage?.removeChild(line); // Optional chaining for safety
				line.destroy(); // Destroy the graphics object
			});
			beatLines = []; // Clear the state array

			// Cleanup Active Notes Graphics
			activeNotes.forEach(note => {
				currentApp?.stage?.removeChild(note.headGraphics);
				note.headGraphics.destroy();
				if (note.bodyGraphics) {
					currentApp?.stage?.removeChild(note.bodyGraphics);
					note.bodyGraphics.destroy();
				}
			});
			activeNotes = [];
			currentNoteIndex = 0;
			songTime = 0;

			// Cleanup PixiJS App
			if (currentApp) {
				currentApp.destroy(true, { children: true }); // Destroy app and its children 
			}
			pixiApp = null; 
			if(canvasContainer) canvasContainer.innerHTML = ''; // Clear canvas container

			// Cleanup Audio
			const audioToClean = audioElement || audioInstance;
			if (audioToClean) {
				audioToClean.pause(); // Stop playback
				audioToClean.removeAttribute('src'); // Release resource
				audioToClean.load(); // Abort loading
			}
			audioElement = null;
			timeSinceLastBeat = 0; // Reset time accumulator
			
			console.log('Cleanup Complete');
		};
	}); // End of $effect

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