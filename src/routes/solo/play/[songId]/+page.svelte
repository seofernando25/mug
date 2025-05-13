<script lang="ts">
	import { Colors, GameplaySizing } from '$lib/gameplayConstants';
	import { drawHighway, drawHighwayLines, drawHitZone, redrawBeatLineGraphicsOnResize, redrawNoteGraphicsOnResize, updateBeatLines, updateNotes } from '$lib/rendering';
	import { isPaused, masterVolume, musicVolume } from '$lib/stores/settingsStore';
	import type { BeatLineEntry, ChartHitObject } from '$lib/types';
	import { Application, Graphics, Color } from 'pixi.js';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>(); 

	let pixiApp = $state<Application | null>(null); // Use $state
	let canvasContainer: HTMLDivElement;
	let audioElement = $state<HTMLAudioElement | null>(null); // Single source of truth for the audio element
	let beatLines = $state<BeatLineEntry[]>([]); // Store active beat line Graphics objects with their beat times
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

	// Web Audio API State
	let audioContext = $state<AudioContext | null>(null);
	let analyserNode = $state<AnalyserNode | null>(null);
	let audioSourceNode = $state<MediaElementAudioSourceNode | null>(null);
	let audioDataArray = $state<Uint8Array | null>(null);


	// Helper function to interpolate between two hex colors
	function interpolateColor(color1: number, color2: number, factor: number): number {
		const r1 = (color1 >> 16) & 0xff;
		const g1 = (color1 >> 8) & 0xff;
		const b1 = color1 & 0xff;

		const r2 = (color2 >> 16) & 0xff;
		const g2 = (color2 >> 8) & 0xff;
		const b2 = color2 & 0xff;

		const r = Math.round(r1 + factor * (r2 - r1));
		const g = Math.round(g1 + factor * (g2 - g1));
		const b = Math.round(b1 + factor * (b2 - b1));

		return (r << 16) | (g << 8) | b;
	}


	// Extract data for easier access
	const { songId, metadata, chart } = data;
	const audioSrc = `/songs/${songId}/${metadata.audioFilename}`;

	// Svelte 5: $effect for setup and teardown
	$effect(() => {
		let appInstance: Application | null = null; // For PixiJS
		let gameLoop: ((ticker: any) => void) | null = null;
		let unsubscribePaused: (() => void) | null = null; 

		// Graphics objects
		let highwayGraphics: Graphics | null = null;
		let lineGraphics: Graphics | null = null;
		let hitZoneGraphics: Graphics | null = null;

		const updateLayout = () => {
			if (!pixiApp || !highwayGraphics || !lineGraphics || !hitZoneGraphics) return;

			const app = pixiApp;
			const stageDimensions = { width: app.screen.width, height: app.screen.height };

			const { highwayX, highwayWidth, laneWidth } = drawHighway(highwayGraphics, stageDimensions, chart.lanes);
			drawHighwayLines(lineGraphics, stageDimensions, chart.lanes, highwayX, laneWidth);
			const { hitZoneY } = drawHitZone(hitZoneGraphics, stageDimensions, highwayX, chart.lanes, laneWidth);
			
			redrawBeatLineGraphicsOnResize(beatLines, highwayX, highwayWidth);
			redrawNoteGraphicsOnResize(noteGraphicsMap, highwayX, laneWidth, hitZoneY, scrollSpeed);
		};

		const initGameplay = async () => {
			if (!canvasContainer) return;

			// --- PixiJS Setup ---
			try {
				appInstance = new Application();
				// Initialize with the base background color. It will be dynamically updated.
				await appInstance.init({ background: Colors.BACKGROUND, resizeTo: canvasContainer });
				canvasContainer.innerHTML = ''; 
				canvasContainer.appendChild(appInstance.canvas);
				pixiApp = appInstance;
				console.log('[EFFECT] PixiJS Initialized');

				highwayGraphics = new Graphics();
				appInstance.stage.addChild(highwayGraphics);
				lineGraphics = new Graphics();
				appInstance.stage.addChild(lineGraphics);
				hitZoneGraphics = new Graphics();
				appInstance.stage.addChild(hitZoneGraphics);
				
				updateLayout(); 
				beatLines = []; 
				const sortedHitObjects: Array<ChartHitObject & { id: number }> = [...(chart.hitObjects || [])]
					.sort((a, b) => a.time - b.time)
					.map((note, index) => ({ ...note, id: index }));
				noteGraphicsMap = new Map<number, NoteGraphicsEntry>();

				// --- Audio Element Setup (before Web Audio API) ---
				console.log('[EFFECT] Initializing Audio Element...');
				const localAudioInstance = new Audio(audioSrc);
				localAudioInstance.preload = 'auto';
				audioElement = localAudioInstance; 
				console.log('[EFFECT] audioElement created:', audioElement?.src);


				// --- Web Audio API Setup (after audioElement is ready) ---
				try {
					if (audioElement && !audioContext) { // Create only if it doesn't exist
						console.log('[EFFECT] Initializing Web Audio API...');
						const context = new AudioContext();
						audioContext = context;

						const source = context.createMediaElementSource(audioElement);
						audioSourceNode = source;

						const analyser = context.createAnalyser();
						analyser.fftSize = 256; // Or 512, 1024. Determines data array size.
						analyserNode = analyser;
						
						audioDataArray = new Uint8Array(analyserNode.frequencyBinCount);

						audioSourceNode.connect(analyserNode);
						analyserNode.connect(audioContext.destination); // Connect analyser to output
						console.log('[EFFECT] Web Audio API setup complete.');
					}
				} catch (waError) {
					console.error('[EFFECT] Failed to initialize Web Audio API:', waError);
					// Gameplay can continue without audio visualization if this fails
				}
				
				// --- Start Audio Playback (after Web Audio API setup if possible) ---
				if (!$isPaused && audioElement) {
					console.log('[EFFECT] Attempting initial audio play...');
					audioElement.play().then(() => {
						console.log('[EFFECT] Initial audio playback started.');
						if (audioContext && audioContext.state === 'suspended') {
							audioContext.resume().then(() => console.log('[EFFECT] AudioContext resumed after play.'));
						}
					}).catch(e => console.error("[EFFECT] Error during initial audio play:", e));
				} else {
					console.log('[EFFECT] Initial audio play skipped.');
				}


				gameLoop = (ticker) => {
					if (!appInstance || !pixiApp) return;
					const deltaMs = ticker.deltaMS;
					const MAX_DELTA_SECONDS = 1 / 30; 
					const cappedDeltaSeconds = Math.min(deltaMs / 1000, MAX_DELTA_SECONDS);

					if (audioElement) {
						songTime = audioElement.currentTime * 1000;
					} else {
						songTime += deltaMs; 
					}
				
					const currentSongTimeSeconds = songTime / 1000;
					const bpm = metadata.bpm > 0 ? metadata.bpm : 120;

					// --- Audio Visualization Logic ---
					if (analyserNode && audioDataArray && appInstance) {
						analyserNode.getByteTimeDomainData(audioDataArray); // Get waveform data
						
						let sum = 0;
						for (let i = 0; i < audioDataArray.length; i++) {
							// Convert byte value (0-255) to a range centered at 0 (-1 to 1 for perfect sine)
							const normalizedValue = (audioDataArray[i] / 128.0) - 1.0;
							sum += normalizedValue * normalizedValue; // Sum of squares
						}
						const rms = Math.sqrt(sum / audioDataArray.length); // Root Mean Square
						
						// Normalize RMS to a factor (e.g., 0 to 1). Max RMS is around 0.707 for a full sine wave.
						// Let's amplify it a bit for more visual impact and clamp.
						const volumeFactor = Math.min(1, rms * 2.5); 

						const bgColor = interpolateColor(Colors.BACKGROUND, Colors.BACKGROUND_PULSE, volumeFactor);
						
						// Check if the renderer and background property exist
						if (appInstance.renderer && appInstance.renderer.background) {
							appInstance.renderer.background.color = bgColor;
						}
					}
					
					const stageWidth = pixiApp.screen.width;
					const stageHeight = pixiApp.screen.height;
					const stageDimensions = { width: stageWidth, height: stageHeight };
					const highwayX = (stageWidth * (1 - GameplaySizing.HIGHWAY_WIDTH_RATIO)) / 2;
					const highwayWidth = stageWidth * GameplaySizing.HIGHWAY_WIDTH_RATIO;
					const playheadY = stageHeight * GameplaySizing.HIT_ZONE_Y_RATIO;

					const newBeatLinesState = updateBeatLines(
						currentSongTimeSeconds, bpm, scrollSpeed, cappedDeltaSeconds,
						stageDimensions, highwayX, highwayWidth, playheadY,
						beatLines, appInstance.stage 
					);
					if (newBeatLinesState.length !== beatLines.length || newBeatLinesState.some((val, i) => val !== beatLines[i])) {
						beatLines = newBeatLinesState; 
					}

					const noteCtx = {
						songTimeMs: songTime, scrollSpeed, stage: stageDimensions, lanes: chart.lanes,
						highwayX, highwayWidth, laneWidth: highwayWidth / chart.lanes,
						hitZoneY: playheadY, pixiStage: appInstance.stage, deltaSeconds: cappedDeltaSeconds
					};
					const newNoteMapState = updateNotes(noteCtx, sortedHitObjects, noteGraphicsMap);
					if (newNoteMapState !== noteGraphicsMap || newNoteMapState.size !== noteGraphicsMap.size) {
					    noteGraphicsMap = newNoteMapState;
					}
				};

				appInstance.ticker.add(gameLoop);
				appInstance.renderer.on('resize', updateLayout);
				console.log('[EFFECT] PixiJS game loop and resize handler added.');

			} catch (error) {
				console.error("[EFFECT] Failed to initialize PixiJS:", error);
				return; 
			}
			
			// Audio Setup and isPaused subscription remain largely the same, but ensure AudioContext resume
			// ... (Existing Audio Setup and isPaused Subscription) ...
			// Minor change: Ensure AudioContext is resumed when unpausing if it was suspended.
			unsubscribePaused = isPaused.subscribe(paused => {
				console.log(`[PauseEffect] isPaused changed to: ${paused}`);
				if (appInstance && appInstance.ticker) {
					if (paused) {
						if (appInstance.ticker.started) appInstance.ticker.stop();
					} else {
						if (!appInstance.ticker.started) appInstance.ticker.start();
					}
				}
				const currentAudio = audioElement;
				if (currentAudio) {
					if (paused) {
						if (!currentAudio.paused) currentAudio.pause();
					} else {
						if (currentAudio.paused) {
							currentAudio.play().catch(e => console.error("[PauseEffect] Error resuming audio:", e));
							// Resume AudioContext if it was suspended (e.g., by browser auto-play policy)
							if (audioContext && audioContext.state === 'suspended') {
								audioContext.resume().then(() => console.log('[PauseEffect] AudioContext resumed.'));
							}
						}
					}
				}
			});


		}; // End of initGameplay

		initGameplay().then(() => {
			console.log('[EFFECT] initGameplay promise resolved.');
		}).catch(err => {
			console.error('[EFFECT] initGameplay promise rejected:', err);
		});

		$effect.pre(() => {
			const currentAudio = audioElement; 
			if (currentAudio && typeof $masterVolume === 'number' && typeof $musicVolume === 'number') {
				const newVolume = Math.max(0, Math.min(1, $masterVolume * $musicVolume));
				currentAudio.volume = newVolume;
			}
		});

		const handleResize = () => updateLayout();
		window.addEventListener('resize', handleResize);

		return () => {
			console.log('[EFFECT Cleanup] Starting main cleanup...');

			if (unsubscribePaused) unsubscribePaused();
			window.removeEventListener('resize', handleResize);

			const currentApp = pixiApp || appInstance;
			if (currentApp && gameLoop) currentApp.ticker.remove(gameLoop);
			if (currentApp) currentApp.renderer.off('resize', updateLayout);

			beatLines.forEach(lineData => { currentApp?.stage?.removeChild(lineData.graphics); lineData.graphics.destroy(); });
			beatLines = [];
			noteGraphicsMap.forEach((entry) => { currentApp?.stage?.removeChild(entry.headGraphics); entry.headGraphics.destroy(); if(entry.bodyGraphics){currentApp?.stage?.removeChild(entry.bodyGraphics); entry.bodyGraphics.destroy();}});
			noteGraphicsMap.clear();
			
			if (currentApp) { currentApp.destroy(true, { children: true }); pixiApp = null; }
			if(canvasContainer) canvasContainer.innerHTML = '';

			// Web Audio API Cleanup
			if (audioSourceNode) {
				audioSourceNode.disconnect();
				audioSourceNode = null;
				console.log('[EFFECT Cleanup] AudioSourceNode disconnected.');
			}
			if (analyserNode) {
				analyserNode.disconnect();
				analyserNode = null;
				console.log('[EFFECT Cleanup] AnalyserNode disconnected.');
			}
			if (audioContext) {
				if (audioContext.state !== 'closed') {
					audioContext.close().then(() => console.log('[EFFECT Cleanup] AudioContext closed.'));
				}
				audioContext = null;
			}
			audioDataArray = null;

			const audioToClean = audioElement; 
			if (audioToClean) {
				audioToClean.pause();
				audioToClean.removeAttribute('src');
				audioToClean.load(); 
				console.log('[EFFECT Cleanup] audioElement cleaned up.');
			}
			audioElement = null; 
			
			console.log('[EFFECT Cleanup] Main cleanup finished.');
		};
	}); 

</script>

<svelte:head>
	<title>Playing {metadata.title} by {metadata.artist} - MUG</title>
</svelte:head>

<!-- Main container for full-screen layout -->
<div class="w-screen h-screen overflow-hidden relative bg-black"> 
	<!-- Canvas Container - Fixed to cover screen -->
	<div bind:this={canvasContainer} 
		 class="fixed top-0 left-0 w-full h-full z-0"> 
		{#if !pixiApp}
			<p class="absolute inset-0 flex items-center justify-center text-gray-400">Loading Gameplay...</p>
		{/if}
		<!-- PixiJS canvas will be appended here by the script -->
	</div>

	<!-- Overlay for Title and Difficulty -->
	<div class="fixed top-4 left-4 z-10 text-white p-3 rounded-md bg-black bg-opacity-30">
		<h1 class="text-xl font-bold mb-1 drop-shadow-lg">{metadata.title} - {metadata.artist}</h1>
		<p class="text-sm drop-shadow-lg">Difficulty: <span class="font-mono text-purple-300">{chart.difficultyName}</span></p>
	</div>
</div>

<style lang="postcss">
	:global(html, body) {
		overflow: hidden !important;
		height: 100% !important;
		margin: 0 !important;
		padding: 0 !important;
		background-color: #000; /* Default background for html/body to prevent white flash */
	}
</style> 