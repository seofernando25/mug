<script lang="ts">
	import { Application, Graphics } from 'pixi.js';
	import type { PageData } from './$types'; // PageData now includes metadata and chart
	import { masterVolume, isPaused, musicVolume } from '$lib/stores/settingsStore'; // Added musicVolume

	let { data } = $props<{ data: PageData }>(); 

	let pixiApp = $state<Application | null>(null); // Use $state
	let canvasContainer: HTMLDivElement;
	let audioElement = $state<HTMLAudioElement | null>(null); // Single source of truth for the audio element
	let beatLines = $state<Graphics[]>([]); // Store active beat line Graphics objects
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

	// --- Appearance Constants ---
	const noteColorTap = 0x00ff00; 
	const noteColorHoldHead = 0x00aaff;
	const noteColorHoldBody = 0x0077cc;
	const beatLineHeight = 2;
	const beatLineColor = 0x555555;
	const beatLineAlpha = 0.7;
	const noteRenderGracePeriodMs = 500; // How long notes stay visible after passing hit zone time
	const lookaheadSeconds = 8.0; // How many seconds in advance notes appear

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
			noteGraphicsMap.forEach(graphicsEntry => {
				const noteVisualWidth = laneWidth * noteWidthRatio;
				const noteX = highwayX + (graphicsEntry.lane * laneWidth) + (laneWidth - noteVisualWidth) / 2;
				graphicsEntry.headGraphics.x = noteX;
				// If width needs to change (it does based on laneWidth)
				// We might need to redraw or scale. Redrawing is simpler for rects.
				// Redraw the head note with the new width
				const headNoteHeight = 20; // This should ideally be a constant elsewhere
				graphicsEntry.headGraphics.clear();
				graphicsEntry.headGraphics.rect(0, 0, noteVisualWidth, headNoteHeight)
					.fill({ color: graphicsEntry.type === 'hold' ? noteColorHoldHead : noteColorTap });

				if (graphicsEntry.bodyGraphics) {
					graphicsEntry.bodyGraphics.x = noteX;
					// Similarly, update body width if necessary - Redraw
					const bodyHeight = graphicsEntry.duration ? (graphicsEntry.duration / 1000) * scrollSpeed : 0;
					graphicsEntry.bodyGraphics.clear();
					graphicsEntry.bodyGraphics.rect(0, 0, noteVisualWidth, bodyHeight)
						.fill({ color: noteColorHoldBody });
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
				// Draw lane separator lines as thin rectangles - MOVED TO updateLayout
				/* for (let i = 0; i < chart.lanes + 1; i++) { ... } */
				
				
				appInstance.stage.addChild(lineGraphics); // Add lines graphics to stage

				// Draw Hit Zone (Judgment Line) - Now using a rectangle
				// Dimensions calculated in updateLayout
				/* const hitZoneYRatio = 0.85; ... */ 
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
				timeSinceLastBeat = 0; // Reset on init
				beatLines = []; // Reset on init

				// --- Note Setup ---
				// Note appearance constants moved to script scope
				
				// Ensure notes (hitObjects) are sorted by time (now in ms)
				// Assign a unique ID (index) to each note for the map key
				const sortedHitObjects = [...(chart.hitObjects || [])]
					.sort((a, b) => a.time - b.time)
					.map((note, index) => ({ ...note, id: index })); // Add id

				noteGraphicsMap = new Map(); // Clear the map on init

				gameLoop = (ticker) => {
					if (!appInstance || !pixiApp) return;
					const deltaMs = ticker.deltaMS;
					const deltaSeconds = deltaMs / 1000;
					songTime = audioElement ? audioElement.currentTime * 1000 : songTime + deltaMs;

					// Update songTime based on actual audio playback time for synchronization
					songTime = audioElement ? audioElement.currentTime * 1000 : songTime + deltaMs;

					// --- Beat Line Spawning & Movement (Keep as is) ---
					// (Existing beat line logic ...)
					// ... Move existing beat lines ...
					beatLines.forEach(line => { line.y += scrollSpeed * deltaSeconds; });
					// ... Despawn lines below screen ...
					const stageHeight = pixiApp.screen.height; // Get current height for despawn check
					const beatLineHeight = 2; // Constant from init
					const remainingLines: Graphics[] = [];
					beatLines.forEach(line => {
						if (line.y - beatLineHeight / 2 > stageHeight) {
							appInstance?.stage.removeChild(line);
							line.destroy();
						} else {
							remainingLines.push(line);
						}
					});
					if (remainingLines.length !== beatLines.length) {
						beatLines = remainingLines;
					}
					// ... Spawn new beat lines ...
					const bpm = metadata.bpm > 0 ? metadata.bpm : 120;
					const beatIntervalMs = (60 / bpm) * 1000;
					const highwayX = (pixiApp.screen.width * (1 - 0.6)) / 2; // Recalculate highwayX
					const highwayWidth = pixiApp.screen.width * 0.6;
					const beatLineColor = 0x555555;
					const beatLineAlpha = 0.7;
					timeSinceLastBeat += deltaMs;
					while (timeSinceLastBeat >= beatIntervalMs) {
						const newBeatLine = new Graphics();
						newBeatLine.rect(highwayX, -beatLineHeight / 2, highwayWidth, beatLineHeight)
							.fill({ color: beatLineColor, alpha: beatLineAlpha });
						newBeatLine.y = 0; 
						appInstance?.stage.addChild(newBeatLine);
						beatLines = [...beatLines, newBeatLine];
						timeSinceLastBeat -= beatIntervalMs;
					}
					// --- End Beat Line Logic ---

					// --- Note Rendering Cycle (New Architecture) ---
					
					// 1. Get current dimensions for positioning
					const currentStageWidth = pixiApp.screen.width;
					const currentStageHeight = pixiApp.screen.height;
					const currentHighwayWidthRatio = 0.6;
					const currentHighwayWidth = currentStageWidth * currentHighwayWidthRatio;
					const currentLaneWidth = currentHighwayWidth / chart.lanes;
					const currentHighwayX = (currentStageWidth - currentHighwayWidth) / 2;
					const currentHitZoneYRatio = 0.85;
					const currentHitZoneY = currentStageHeight * currentHitZoneYRatio;
					const currentNoteWidthRatio = 0.9;
					const currentNoteHeight = 20;
					
					// 2. Define visible time window
					const lookaheadMs = lookaheadSeconds * 1000;
					const minVisibleTime = songTime - noteRenderGracePeriodMs;
					const maxVisibleTime = songTime + lookaheadMs;
					
					const visibleNoteIdsThisFrame = new Set<number>();
					const newNoteGraphicsMap = new Map(noteGraphicsMap); // Work with a copy for state changes

					// 3. Iterate all notes, update/create visible ones
					sortedHitObjects.forEach(noteData => {
						const noteTime = noteData.time;
						const noteId = noteData.id; // Use the ID we added
						
						if (noteTime >= minVisibleTime && noteTime <= maxVisibleTime) {
							visibleNoteIdsThisFrame.add(noteId);
							let graphicsEntry = newNoteGraphicsMap.get(noteId);
							
							// Calculate current position
							const currentY = currentHitZoneY - ((noteTime - songTime) / 1000 * scrollSpeed);
							const noteVisualWidth = currentLaneWidth * currentNoteWidthRatio;
							const noteX = currentHighwayX + (noteData.lane * currentLaneWidth) + (currentLaneWidth - noteVisualWidth) / 2;
							
							if (!graphicsEntry) {
								// --- Create Graphics --- 
								// Calculate initial Y based on song time
								const initialY = currentHitZoneY - ((noteTime - songTime) / 1000 * scrollSpeed);

								const headGraphics = new Graphics();
								headGraphics.rect(0, 0, noteVisualWidth, currentNoteHeight)
										   .fill({ color: noteData.type === 'hold' ? noteColorHoldHead : noteColorTap });
								headGraphics.x = noteX;
								headGraphics.y = initialY; 
								appInstance?.stage.addChild(headGraphics);
								
								let bodyGraphics: Graphics | undefined = undefined;
								if (noteData.type === 'hold' && noteData.duration && noteData.duration > 0) {
									const bodyHeight = (noteData.duration / 1000) * scrollSpeed;
									bodyGraphics = new Graphics();
									bodyGraphics.rect(0, 0, noteVisualWidth, bodyHeight)
												 .fill({ color: noteColorHoldBody });
									bodyGraphics.x = noteX;
									bodyGraphics.y = initialY + currentNoteHeight;
									appInstance?.stage.addChild(bodyGraphics);
								}
								
								graphicsEntry = {
									headGraphics,
									bodyGraphics,
									lane: noteData.lane,
									time: noteData.time,
									duration: noteData.duration,
									type: noteData.type as 'tap' | 'hold'
								};
								newNoteGraphicsMap.set(noteId, graphicsEntry);
							} else {
								// --- Update Position (Hybrid Approach) --- 
								const idealY = currentHitZoneY - ((noteTime - songTime) / 1000 * scrollSpeed);
								const incrementalY = graphicsEntry.headGraphics.y + scrollSpeed * deltaSeconds;
								const driftThreshold = 100.0; // Allowable pixel drift before snapping
								const drift = Math.abs(idealY - incrementalY);
								
								let newY = incrementalY;
								if (drift > driftThreshold) {
									newY = idealY; // Snap back if drifted too much
								}
								
								graphicsEntry.headGraphics.x = noteX; // Update X for resize
								graphicsEntry.headGraphics.y = newY; 

								if (graphicsEntry.bodyGraphics) {
									// Body follows head, apply same logic
									const idealBodyY = idealY + currentNoteHeight;
									const incrementalBodyY = graphicsEntry.bodyGraphics.y + scrollSpeed * deltaSeconds;
									const bodyDrift = Math.abs(idealBodyY - incrementalBodyY);
									
									let newBodyY = incrementalBodyY;
									if (bodyDrift > driftThreshold) {
										newBodyY = idealBodyY; // Snap back
									}

									graphicsEntry.bodyGraphics.x = noteX; // Update X for resize
									graphicsEntry.bodyGraphics.y = newBodyY;
									// TODO: Implement hold note tail shrinking if desired
								}
							}
						}
					});

					// 4. Cull notes no longer visible
					let mapChanged = false;
					for (const [noteId, graphicsEntry] of newNoteGraphicsMap) {
						if (!visibleNoteIdsThisFrame.has(noteId)) {
							appInstance?.stage.removeChild(graphicsEntry.headGraphics);
							graphicsEntry.headGraphics.destroy();
							if (graphicsEntry.bodyGraphics) {
								appInstance?.stage.removeChild(graphicsEntry.bodyGraphics);
								graphicsEntry.bodyGraphics.destroy();
							}
							newNoteGraphicsMap.delete(noteId);
							mapChanged = true;
						}
					}

					// 5. Update state if the map changed
					if (mapChanged || newNoteGraphicsMap.size !== noteGraphicsMap.size) {
						noteGraphicsMap = new Map(newNoteGraphicsMap); // Trigger reactivity by creating a new map instance
					}
					// --- End Note Rendering Cycle ---
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

			beatLines.forEach(line => { currentApp?.stage?.removeChild(line); line.destroy(); });
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
			timeSinceLastBeat = 0;
			
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