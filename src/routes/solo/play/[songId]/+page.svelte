<script lang="ts">
	import { Colors, GameplaySizing } from '$lib/gameplayConstants';
	import { drawHighway, drawHighwayLines, drawHitZone, redrawBeatLineGraphicsOnResize, redrawNoteGraphicsOnResize, updateBeatLines, updateNotes } from '$lib/rendering';
	import { isPaused, masterVolume, musicVolume } from '$lib/stores/settingsStore';
	import type { BeatLineEntry, ChartHitObject } from '$lib/types';
	import { Application, Graphics } from 'pixi.js';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>(); 

	let pixiApp = $state<Application | null>(null); // Use $state
	let canvasContainer: HTMLDivElement;
	let audioElement = $state<HTMLAudioElement | null>(null); // Single source of truth for the audio element
	let beatLines = $state<BeatLineEntry[]>([]); // Store active beat line Graphics objects with their beat times
	let timeSinceLastBeat = $state(0); // Time accumulator for beat spawning
	let songTime = $state(0); // Elapsed time in ms

	type NoteGraphicsEntry = {
		headGraphics: Graphics;
		bodyGraphics?: Graphics;
		lane: number; // Store lane for resize updates
		time: number; // Store time for easier access during resize/updates
		duration?: number; // Store duration for hold notes
		type: 'tap' | 'hold'; // Store type
	};
	let noteGraphicsMap = $state(new Map<number, NoteGraphicsEntry>()); // Key: index from sortedHitObjects

	const scrollSpeed = $state(300); // Pixels per second notes/lines travel down


	// Extract data for easier access
	const { songId, metadata, chart } = data;
	const audioSrc = `/songs/${songId}/${metadata.audioFilename}`;

	// Svelte 5: $effect for setup and teardown
	$effect(() => {
		let appInstance: Application | null = null; // For PixiJS
		let gameLoop: ((ticker: any) => void) | null = null;
		let unsubscribePaused: (() => void) | null = null; // Moved declaration here

		// Graphics objects that need updating on resize
		let highwayGraphics: Graphics | null = null;
		let lineGraphics: Graphics | null = null;
		let hitZoneGraphics: Graphics | null = null;

		// Function to calculate layout and redraw static elements
		const updateLayout = () => {
			if (!pixiApp || !highwayGraphics || !lineGraphics || !hitZoneGraphics) return;

			const app = pixiApp;
			const stageDimensions = { width: app.screen.width, height: app.screen.height };

			// --- Redraw Highway, Lines, and HitZone using imported functions ---
			const { highwayX, highwayWidth, laneWidth } = drawHighway(highwayGraphics, stageDimensions, chart.lanes);
			drawHighwayLines(lineGraphics, stageDimensions, chart.lanes, highwayX, laneWidth);
			const { hitZoneY } = drawHitZone(hitZoneGraphics, stageDimensions, highwayX, highwayWidth);
			// note: hitZoneY is returned by drawHitZone but not immediately used here. 
			// It will be crucial for note and beat line positioning logic later.

			// --- Update existing beat line X positions and width ---
			redrawBeatLineGraphicsOnResize(beatLines, highwayX, highwayWidth);

			// --- Update existing note X positions and width ---
			redrawNoteGraphicsOnResize(noteGraphicsMap, highwayX, laneWidth, scrollSpeed);
		};

		const initGameplay = async () => {
			if (!canvasContainer) return;

			// --- PixiJS Setup ---
			try {
				appInstance = new Application();
				await appInstance.init({ background: Colors.BACKGROUND, resizeTo: canvasContainer });
				canvasContainer.innerHTML = ''; 
				canvasContainer.appendChild(appInstance.canvas);
				pixiApp = appInstance;
				console.log('[EFFECT] PixiJS Initialized');

				// --- Stage Setup ---
				// Initial dimensions are calculated and applied in updateLayout

				// Draw Highway Background (Using PixiJS v8 methods)
				highwayGraphics = new Graphics(); // Assign to variable

				// Fill each lane rectangle - MOVED TO updateLayout
				/* for (let i = 0; i < chart.lanes; i++) { ... } */

				appInstance.stage.addChild(highwayGraphics); // Add background rects to stage

				// Draw Highway Lines (Using PixiJS v8 methods)
				lineGraphics = new Graphics(); // Assign to variable
				
				
				appInstance.stage.addChild(lineGraphics); // Add lines graphics to stage

			
				hitZoneGraphics = new Graphics(); // Assign to variable
				
				appInstance.stage.addChild(hitZoneGraphics);

				console.log('Chart Data:', chart);

				// --- Initial Layout Draw ---
				updateLayout(); 

				// --- Beat Line Setup ---
				// const bpm = metadata.bpm > 0 ? metadata.bpm : 120; // bpm is used in gameLoop, not directly here anymore
				// timeSinceLastBeat = 0; // Removed as unused
				beatLines = []; // Reset on init

				// --- Note Setup ---
				// Note appearance constants are now primarily in gameplayConstants.ts
				
				// Ensure notes (hitObjects) are sorted by time (now in ms)
				// Assign a unique ID (index) to each note for the map key
				const sortedHitObjects: Array<ChartHitObject & { id: number }> = [...(chart.hitObjects || [])]
					.sort((a, b) => a.time - b.time)
					.map((note, index) => ({ ...note, id: index })); // Add id

				noteGraphicsMap = new Map<number, NoteGraphicsEntry>(); // Specify type for clarity

				gameLoop = (ticker) => {
					if (!appInstance || !pixiApp) return;
					const deltaMs = ticker.deltaMS;
					let deltaSeconds = deltaMs / 1000;

					// Cap deltaSeconds to prevent extreme jumps during stutters
					const MAX_DELTA_SECONDS = 1 / 30; // E.g., cap at a 30 FPS equivalent
					const cappedDeltaSeconds = Math.min(deltaSeconds, MAX_DELTA_SECONDS);

					// songTime should still update with the potentially large, real deltaMs from the ticker
					// if audioElement is not available as a fallback, or even alongside it to keep it moving if audio desyncs.
					// However, primary source of truth is audioEl.currentTime.
					if (audioElement) {
						songTime = audioElement.currentTime * 1000;
					} else {
						songTime += deltaMs; // Fallback if audio element isn't ready (e.g. initial load)
					}
				
					const currentSongTimeSeconds = songTime / 1000;

					const bpm = metadata.bpm > 0 ? metadata.bpm : 120;
					
					const stageWidth = pixiApp.screen.width;
					const stageHeight = pixiApp.screen.height;
					const stageDimensions = { width: stageWidth, height: stageHeight };
					
					const highwayX = (stageWidth * (1 - GameplaySizing.HIGHWAY_WIDTH_RATIO)) / 2;
					const highwayWidth = stageWidth * GameplaySizing.HIGHWAY_WIDTH_RATIO;
					const playheadY = stageHeight * GameplaySizing.HIT_ZONE_Y_RATIO; // Align with hit zone for consistency

					// --- Update Beat Lines (using imported function) ---
					const newBeatLinesState = updateBeatLines(
						currentSongTimeSeconds,
						bpm,
						scrollSpeed,
						cappedDeltaSeconds,
						stageDimensions,
						highwayX,
						highwayWidth,
						playheadY,
						beatLines, 
						appInstance.stage 
					);
					if (newBeatLinesState.length !== beatLines.length || newBeatLinesState.some((val, i) => val !== beatLines[i])) {
						beatLines = newBeatLinesState; 
					}
					// Note: Old beat line logic that was here is now in rendering.ts

					// --- Note Rendering Cycle (using imported function) ---
					const noteCtx = {
						songTimeMs: songTime,
						scrollSpeed,
						stage: stageDimensions,
						lanes: chart.lanes,
						highwayX,
						highwayWidth,
						laneWidth: highwayWidth / chart.lanes, // Calculate laneWidth here
						hitZoneY: playheadY, // playheadY is effectively the hitZoneY for notes
						pixiStage: appInstance.stage,
						deltaSeconds: cappedDeltaSeconds // Assign cappedDeltaSeconds to the deltaSeconds property
					};

					const newNoteMapState = updateNotes(noteCtx, sortedHitObjects, noteGraphicsMap);
					// Check if map instance or size has changed to trigger Svelte reactivity
					if (newNoteMapState !== noteGraphicsMap || newNoteMapState.size !== noteGraphicsMap.size) {
					    noteGraphicsMap = newNoteMapState;
					}
					// Note: Old note rendering cycle logic that was here is now in rendering.ts
				};

				appInstance.ticker.add(gameLoop);
				appInstance.renderer.on('resize', updateLayout);
				console.log('[EFFECT] PixiJS game loop and resize handler added.');

			} catch (error) {
				console.error("[EFFECT] Failed to initialize PixiJS:", error);
				return; // Stop if Pixi fails
			}
			
			// --- Audio Setup (after PixiJS init) ---
			try {
				console.log('[EFFECT] Initializing Audio...');
				const localAudioInstance = new Audio(audioSrc);
				localAudioInstance.preload = 'auto';
				audioElement = localAudioInstance; // Assign to reactive $state variable
				console.log('[EFFECT] audioElement created and assigned:', audioElement?.src);

				if (!$isPaused && audioElement) {
					console.log('[EFFECT] Attempting initial audio play...');
					audioElement.play().then(() => {
						console.log('[EFFECT] Initial audio playback started successfully.');
					}).catch(e => console.error("[EFFECT] Error during initial audio play:", e));
				} else {
					console.log('[EFFECT] Initial audio play skipped (paused or no audioElement).');
				}
			} catch (error) {
				console.error("[EFFECT] Failed to create Audio element:", error);
				// Even if audio fails, Pixi might be up, so don't return yet, let effects manage.
			}

			// --- Setup isPaused Subscription (AFTER appInstance and audioElement are potentially ready) ---
			console.log('[EFFECT] Setting up isPaused subscription...');
			unsubscribePaused = isPaused.subscribe(paused => {
				console.log(`[PauseEffect] isPaused changed to: ${paused}`);
				// PixiJS Ticker Control
				if (appInstance && appInstance.ticker) { // Extra check for appInstance.ticker
					if (paused) {
						if (appInstance.ticker.started) {
							appInstance.ticker.stop();
							console.log('[PauseEffect] PixiJS Ticker Paused');
						}
					} else {
						if (!appInstance.ticker.started) {
							appInstance.ticker.start();
							console.log('[PauseEffect] PixiJS Ticker Resumed');
						}
					}
				} else {
					console.log('[PauseEffect] appInstance or appInstance.ticker not ready for PixiJS control.');
				}
				// Audio Control
				const currentAudio = audioElement;
				if (currentAudio) {
					if (paused) {
						if (!currentAudio.paused) {
							currentAudio.pause();
							console.log('[PauseEffect] Audio Paused via audioElement');
						}
					} else {
						if (currentAudio.paused) {
							console.log('[PauseEffect] Attempting audio resume...');
							currentAudio.play().then(() => {
								console.log('[PauseEffect] Audio Resumed successfully via audioElement');
							}).catch(e => console.error("[PauseEffect] Error resuming audio:", e));
						}
					}
				} else {
					console.log('[PauseEffect] No audioElement to pause/resume.');
				}
			});
			console.log('[EFFECT] isPaused subscription setup complete.');

		};

		initGameplay().then(() => {
			console.log('[EFFECT] initGameplay promise resolved.');
		}).catch(err => {
			console.error('[EFFECT] initGameplay promise rejected:', err);
		});

		// Svelte 5: Reactive effect for combined volume control (remains outside initGameplay)
		$effect.pre(() => {
			const currentAudio = audioElement; 
			if (currentAudio && typeof $masterVolume === 'number' && typeof $musicVolume === 'number') {
				const newVolume = Math.max(0, Math.min(1, $masterVolume * $musicVolume));
				currentAudio.volume = newVolume;
				console.log(`[VolumeEffect] Volume updated: master=${$masterVolume}, music=${$musicVolume}, final=${newVolume}, target=${currentAudio.src}`);
			} else {
				// console.log(`[VolumeEffect] Conditions not met: audioElement=${!!currentAudio}, masterVol=${$masterVolume}, musicVol=${$musicVolume}`);
			}
		});

		const handleResize = () => updateLayout();
		window.addEventListener('resize', handleResize);

		// Cleanup function for the main $effect (remains largely the same, ensures unsubscribePaused is called)
		return () => {
			console.log('[EFFECT Cleanup] Starting main cleanup...');

			if (unsubscribePaused) { // This will now be called
				unsubscribePaused();
				console.log('[EFFECT Cleanup] Unsubscribed from isPaused');
			}

			window.removeEventListener('resize', handleResize);
			console.log('[EFFECT Cleanup] Removed resize listener');

			const currentApp = pixiApp || appInstance;

			if (currentApp && gameLoop) {
				currentApp.ticker.remove(gameLoop);
				gameLoop = null;
				console.log('[EFFECT Cleanup] Removed game loop from ticker');
			}
			if (currentApp) {
				currentApp.renderer.off('resize', updateLayout);
				console.log('[EFFECT Cleanup] Removed PixiJS resize listener');
			}

			beatLines.forEach(lineData => { currentApp?.stage?.removeChild(lineData.graphics); lineData.graphics.destroy(); });
			beatLines = [];
			noteGraphicsMap.forEach((entry) => { currentApp?.stage?.removeChild(entry.headGraphics); entry.headGraphics.destroy(); if(entry.bodyGraphics){currentApp?.stage?.removeChild(entry.bodyGraphics); entry.bodyGraphics.destroy();}});
			noteGraphicsMap.clear();
			if (currentApp) { currentApp.destroy(true, { children: true }); pixiApp = null; console.log('[EFFECT Cleanup] PixiJS app destroyed'); }
			if(canvasContainer) canvasContainer.innerHTML = '';

			const audioToClean = audioElement; 
			if (audioToClean) {
				console.log(`[EFFECT Cleanup] Cleaning up audioElement: ${audioToClean.src}`);
				audioToClean.pause();
				audioToClean.removeAttribute('src');
				audioToClean.load(); 
				console.log('[EFFECT Cleanup] audioElement paused, src removed, loaded.');
			} else {
				console.log('[EFFECT Cleanup] No audioElement to cleanup.');
			}
			audioElement = null; 
			// timeSinceLastBeat = 0; // Already removed as unused previously
			
			console.log('[EFFECT Cleanup] Main cleanup finished.');
		};
	}); // End of main $effect

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