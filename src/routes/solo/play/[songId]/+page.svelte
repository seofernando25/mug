<script lang="ts">
	import { Application, Graphics } from 'pixi.js';
	import type { PageData } from './$types'; // PageData now includes metadata and chart
	import { masterVolume, isPaused, musicVolume } from '$lib/stores/settingsStore'; // Added musicVolume
	import { Colors, AlphaValues, GameplaySizing, Timing } from '$lib/gameplayConstants';

	let { data } = $props<{ data: PageData }>(); 

	let pixiApp = $state<Application | null>(null); // Use $state
	let canvasContainer: HTMLDivElement;
	let audioElement = $state<HTMLAudioElement | null>(null); // Single source of truth for the audio element
	let beatLines = $state<Array<{ graphics: Graphics, beatTime: number }>>([]); // Store active beat line Graphics objects with their beat times
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

	// --- Appearance Constants (now mostly imported) ---
	// const noteColorTap = 0x00ff00; 
	// const noteColorHoldHead = 0x00aaff;
	// const noteColorHoldBody = 0x0077cc;
	// const beatLineHeight = 2; // -> GameplaySizing.BEAT_LINE_HEIGHT
	// const beatLineColor = 0x555555; // -> Colors.BEAT_LINE
	// const beatLineAlpha = 0.7; // -> AlphaValues.BEAT_LINE
	// const noteRenderGracePeriodMs = 500; // -> Timing.NOTE_RENDER_GRACE_PERIOD_MS
	// const lookaheadSeconds = 8.0; // -> Timing.LOOKAHEAD_SECONDS

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
			const highwayWidth = stageWidth * GameplaySizing.HIGHWAY_WIDTH_RATIO;
			const laneWidth = highwayWidth / chart.lanes; 
			const highwayX = (stageWidth - highwayWidth) / 2;
			const hitZoneY = stageHeight * GameplaySizing.HIT_ZONE_Y_RATIO;
			// const hitZoneHeight = 4; // -> GameplaySizing.HIT_ZONE_HEIGHT
			// const lineThickness = 2; // -> GameplaySizing.HIGHWAY_LINE_THICKNESS
			// const lineColor = 0x888888; // -> Colors.HIGHWAY_LINE
			// const laneColors = [0x2a2a2e, 0x3a3a3e]; // -> Colors.LANE_BACKGROUNDS
			// const hitZoneColor = 0xffffff; // -> Colors.HIT_ZONE
			// const hitZoneAlpha = 0.9; // -> AlphaValues.HIT_ZONE
			// const noteWidthRatio = 0.9; // -> GameplaySizing.NOTE_WIDTH_RATIO

			// --- Redraw Highway Background ---
			highwayGraphics.clear();
			for (let i = 0; i < chart.lanes; i++) {
				highwayGraphics.rect(highwayX + i * laneWidth, 0, laneWidth, stageHeight)
							   .fill({ color: Colors.LANE_BACKGROUNDS[i % Colors.LANE_BACKGROUNDS.length], alpha: AlphaValues.LANE_BACKGROUND });
			}

			// --- Redraw Highway Lines ---
			lineGraphics.clear();
			for (let i = 0; i < chart.lanes + 1; i++) {
				const lineX = highwayX + i * laneWidth;
				lineGraphics.rect(lineX - GameplaySizing.HIGHWAY_LINE_THICKNESS / 2, 0, GameplaySizing.HIGHWAY_LINE_THICKNESS, stageHeight)
							.fill({ color: Colors.HIGHWAY_LINE });
			}

			// --- Redraw Hit Zone ---
			hitZoneGraphics.clear();
			hitZoneGraphics.rect(highwayX, hitZoneY - GameplaySizing.HIT_ZONE_HEIGHT / 2, highwayWidth, GameplaySizing.HIT_ZONE_HEIGHT)
						   .fill({ color: Colors.HIT_ZONE, alpha: AlphaValues.HIT_ZONE });

			// --- Update existing beat line X positions and width ---
			beatLines.forEach(lineData => {
				lineData.graphics.clear(); // Clear old drawing
				lineData.graphics.rect(highwayX, -GameplaySizing.BEAT_LINE_HEIGHT / 2, highwayWidth, GameplaySizing.BEAT_LINE_HEIGHT)
					.fill({ color: Colors.BEAT_LINE, alpha: AlphaValues.BEAT_LINE });
				// Y position is handled by game loop, only need to ensure width/x are correct
			});

			// --- Update existing note X positions and width ---
			noteGraphicsMap.forEach(graphicsEntry => {
				const noteVisualWidth = laneWidth * GameplaySizing.NOTE_WIDTH_RATIO;
				const noteX = highwayX + (graphicsEntry.lane * laneWidth) + (laneWidth - noteVisualWidth) / 2;
				graphicsEntry.headGraphics.x = noteX;
				// If width needs to change (it does based on laneWidth)
				// We might need to redraw or scale. Redrawing is simpler for rects.
				// Redraw the head note with the new width
				// const headNoteHeight = 20; // -> GameplaySizing.NOTE_HEIGHT
				graphicsEntry.headGraphics.clear();
				graphicsEntry.headGraphics.rect(0, 0, noteVisualWidth, GameplaySizing.NOTE_HEIGHT)
					.fill({ color: graphicsEntry.type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP });

				if (graphicsEntry.bodyGraphics) {
					graphicsEntry.bodyGraphics.x = noteX;
					// Similarly, update body width if necessary - Redraw
					const bodyHeight = graphicsEntry.duration ? (graphicsEntry.duration / 1000) * scrollSpeed : 0;
					graphicsEntry.bodyGraphics.clear();
					graphicsEntry.bodyGraphics.rect(0, 0, noteVisualWidth, bodyHeight)
						.fill({ color: Colors.NOTE_HOLD_BODY });
				}
			});
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
				// Draw lane separator lines as thin rectangles - MOVED TO updateLayout
				/* for (let i = 0; i < chart.lanes + 1; i++) { ... } */
				
				
				appInstance.stage.addChild(lineGraphics); // Add lines graphics to stage

				// Draw Hit Zone (Judgment Line) - Now using a rectangle
				// Dimensions calculated in updateLayout
				/* const hitZoneYRatio = 0.85; ... */ 
				// const hitZoneHeight = 4; // -> GameplaySizing.HIT_ZONE_HEIGHT
				// const hitZoneColor = 0xffffff; // -> Colors.HIT_ZONE
				// const hitZoneAlpha = 0.9; // -> AlphaValues.HIT_ZONE

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

					// --- Beat Line Spawning & Movement (Corrected for Song Sync) ---
					// IMPORTANT: The `beatLines` array declaration elsewhere needs to be updated to:
					// let beatLines: Array<{ graphics: Graphics, beatTime: number }> = [];

					// CRITICAL ASSUMPTION:
					// `currentSongTimeSeconds` MUST be the accurate current playback time of the song in seconds.
					// Replace the placeholder below with your actual implementation for getting song time.
					// For example, if you have an audio element like <audio bind:this={audioEl}>:
					// const currentSongTimeSeconds = audioEl ? audioEl.currentTime : 0;
					// Or if it's from a Svelte store: const currentSongTimeSeconds = $songTimeStore;
					const currentSongTimeSeconds = songTime / 1000; // Use existing songTime (ms to s)

					const bpm = metadata.bpm > 0 ? metadata.bpm : 120;
					const beatIntervalSeconds = (60 / bpm);
					
					const stageWidth = pixiApp.screen.width;
					const stageHeight = pixiApp.screen.height;
					
					const highwayX = (stageWidth * (1 - GameplaySizing.HIGHWAY_WIDTH_RATIO)) / 2;
					const highwayWidth = stageWidth * GameplaySizing.HIGHWAY_WIDTH_RATIO;
					// const beatLineHeight = 2; // -> GameplaySizing.BEAT_LINE_HEIGHT
					// const beatLineColor = 0x555555; // -> Colors.BEAT_LINE
					// const beatLineAlpha = 0.7; // -> AlphaValues.BEAT_LINE

					// Define playheadY: the Y-coordinate where beats align with currentSongTimeSeconds.
					// This should match where notes are judged. Example: 80% down the screen.
					const playheadY = stageHeight * GameplaySizing.HIT_ZONE_Y_RATIO; // Align with hit zone for consistency

					// `scrollSpeed` is assumed to be pixels per second from the original code context.

					// --- Update positions and despawn existing beat lines ---
					const nextBeatLines: Array<{ graphics: Graphics, beatTime: number }> = [];
					for (const lineData of beatLines) {
						const timeDifferenceFromPlayhead = lineData.beatTime - currentSongTimeSeconds;
						// y = playheadY - (time_to_reach_playhead_seconds * scrollSpeed_pixels_per_second)
						lineData.graphics.y = playheadY - (timeDifferenceFromPlayhead * scrollSpeed);

						const isOffScreenBottom = lineData.graphics.y > stageHeight + GameplaySizing.BEAT_LINE_HEIGHT * 5; // Buffer past screen bottom
						const isTooFarInPast = currentSongTimeSeconds - lineData.beatTime > 5.0; // e.g., 5 seconds in the past

						if (isOffScreenBottom || isTooFarInPast) {
							appInstance?.stage.removeChild(lineData.graphics);
							lineData.graphics.destroy();
						} else {
							nextBeatLines.push(lineData);
						}
					}
					// Svelte reactivity: assign new array instance if changed
					if (nextBeatLines.length !== beatLines.length || beatLines.some((val, i) => val !== nextBeatLines[i])) {
						beatLines = nextBeatLines;
					}

					// --- Spawn new beat lines ---
					// Time for a line to travel from y=0 (top of screen) to playheadY:
					const timeTopToPlayhead = playheadY / scrollSpeed;
					// Furthest beat in the future we need to have spawned (add one beatInterval as buffer):
					const furthestBeatTimeToSpawn = currentSongTimeSeconds + timeTopToPlayhead + beatIntervalSeconds;

					// Determine the beat time from which to start considering spawning new lines.
					let lastKnownBeatTime = -beatIntervalSeconds; // Default if no lines exist, to start effectively before beat 0.
					
					if (beatLines.length > 0) {
						// Find the maximum beatTime in the current beatLines array.
						lastKnownBeatTime = -Infinity;
						for(let i = 0; i < beatLines.length; i++) {
							if (beatLines[i].beatTime > lastKnownBeatTime) {
								lastKnownBeatTime = beatLines[i].beatTime;
							}
						}
						if (lastKnownBeatTime === -Infinity) { // Should not happen if beatLines.length > 0
							lastKnownBeatTime = -beatIntervalSeconds; 
						}
					} else {
						// If no lines exist, calculate earliest beat that should be on screen (or just before).
						// Beat time for a line at the very bottom of the screen (stageHeight):
						const earliestOnScreenBeatTime = currentSongTimeSeconds + ((playheadY - stageHeight) / scrollSpeed);
						// Start checking from one beat interval before this.
						lastKnownBeatTime = Math.floor(earliestOnScreenBeatTime / beatIntervalSeconds) * beatIntervalSeconds - beatIntervalSeconds;
					}
					
					const tempNewLinesToAdd: Array<{ graphics: Graphics, beatTime: number }> = [];
					let nextBeatCandidateTime = (Math.floor(lastKnownBeatTime / beatIntervalSeconds) + 1) * beatIntervalSeconds;

					while (nextBeatCandidateTime <= furthestBeatTimeToSpawn) {
						// Ensure we are not trying to spawn for significantly negative times (beat 0 is okay).
						if (nextBeatCandidateTime >= -0.001) { 
							const newBeatLine = new Graphics();
							newBeatLine.rect(highwayX, -GameplaySizing.BEAT_LINE_HEIGHT / 2, highwayWidth, GameplaySizing.BEAT_LINE_HEIGHT)
								.fill({ color: Colors.BEAT_LINE, alpha: AlphaValues.BEAT_LINE });
							
							// Set initial position (will be refined/confirmed next frame, but good for smooth first appearance)
							const timeDiffInitial = nextBeatCandidateTime - currentSongTimeSeconds;
							newBeatLine.y = playheadY - (timeDiffInitial * scrollSpeed);

							appInstance?.stage.addChild(newBeatLine);
							tempNewLinesToAdd.push({ graphics: newBeatLine, beatTime: nextBeatCandidateTime });
						}
						nextBeatCandidateTime += beatIntervalSeconds;
					}

					if (tempNewLinesToAdd.length > 0) {
						beatLines = [...beatLines, ...tempNewLinesToAdd];
						// Optional: sort if order matters for other logic, though spawning should maintain rough order.
						// beatLines.sort((a, b) => a.beatTime - b.beatTime);
					}
					// --- End Beat Line Logic ---

					// --- Note Rendering Cycle (New Architecture) ---
					
					// 1. Get current dimensions for positioning
					const currentStageWidth = pixiApp.screen.width;
					const currentStageHeight = pixiApp.screen.height;
					const currentHighwayWidth = currentStageWidth * GameplaySizing.HIGHWAY_WIDTH_RATIO;
					const currentLaneWidth = currentHighwayWidth / chart.lanes;
					const currentHighwayX = (currentStageWidth - currentHighwayWidth) / 2;
					const currentHitZoneY = currentStageHeight * GameplaySizing.HIT_ZONE_Y_RATIO;
					// const currentNoteWidthRatio = 0.9; // -> GameplaySizing.NOTE_WIDTH_RATIO
					// const currentNoteHeight = 20; // -> GameplaySizing.NOTE_HEIGHT
					
					// 2. Define visible time window
					const lookaheadMs = Timing.LOOKAHEAD_SECONDS * 1000;
					const minVisibleTime = songTime - Timing.NOTE_RENDER_GRACE_PERIOD_MS;
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
							const noteVisualWidth = currentLaneWidth * GameplaySizing.NOTE_WIDTH_RATIO;
							const noteX = currentHighwayX + (noteData.lane * currentLaneWidth) + (currentLaneWidth - noteVisualWidth) / 2;
							
							if (!graphicsEntry) {
								// --- Create Graphics --- 
								// Calculate initial Y based on song time
								const initialY = currentHitZoneY - ((noteTime - songTime) / 1000 * scrollSpeed);

								const headGraphics = new Graphics();
								headGraphics.rect(0, 0, noteVisualWidth, GameplaySizing.NOTE_HEIGHT)
										   .fill({ color: noteData.type === 'hold' ? Colors.NOTE_HOLD_HEAD : Colors.NOTE_TAP });
								headGraphics.x = noteX;
								headGraphics.y = initialY; 
								appInstance?.stage.addChild(headGraphics);
								
								let bodyGraphics: Graphics | undefined = undefined;
								if (noteData.type === 'hold' && noteData.duration && noteData.duration > 0) {
									const bodyHeight = (noteData.duration / 1000) * scrollSpeed;
									bodyGraphics = new Graphics();
									bodyGraphics.rect(0, 0, noteVisualWidth, bodyHeight)
												 .fill({ color: Colors.NOTE_HOLD_BODY });
									bodyGraphics.x = noteX;
									bodyGraphics.y = initialY + GameplaySizing.NOTE_HEIGHT;
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
									const idealBodyY = idealY + GameplaySizing.NOTE_HEIGHT;
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