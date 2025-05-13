<script lang="ts">
	import { Colors, GameplaySizing } from '$lib/gameplayConstants';
	import { drawHighway, drawHighwayLines, drawHitZone, redrawBeatLineGraphicsOnResize, redrawNoteGraphicsOnResize, updateBeatLines, updateNotes } from '$lib/rendering';
	import { isPaused, masterVolume, musicVolume } from '$lib/stores/settingsStore';
	import type { BeatLineEntry, ChartHitObject } from '$lib/types';
	import { Application, Graphics, Color } from 'pixi.js';
	import type { PageData } from './$types';
	import LevitatingTextOverlay from '$lib/LevitatingTextOverlay.svelte';
	import { setupAudioReactiveBackground } from '$lib/useAudioReactiveBackground';

	let { data } = $props<{ data: PageData }>(); 

	let pixiApp = $state<Application | null>(null);
	let canvasContainer: HTMLDivElement;
	let audioElement = $state<HTMLAudioElement | null>(null);
	let beatLines = $state<BeatLineEntry[]>([]);
	let songTime = $state(0);

	type NoteGraphicsEntry = {
		headGraphics: Graphics;
		bodyGraphics?: Graphics;
		lane: number;
		time: number;
		duration?: number;
		type: 'tap' | 'hold';
	};
	let noteGraphicsMap = $state(new Map<number, NoteGraphicsEntry>());

	const scrollSpeed = $state(300);

	let audioReactive: ReturnType<typeof setupAudioReactiveBackground> | null = null;

	const { songId, metadata, chart } = data;
	const audioSrc = `/songs/${songId}/${metadata.audioFilename}`;

	$effect(() => {
		let appInstance: Application | null = null;
		let gameLoop: ((ticker: any) => void) | null = null;
		let unsubscribePaused: (() => void) | null = null; 

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

			try {
				appInstance = new Application();
				await appInstance.init({ background: Colors.BACKGROUND, resizeTo: canvasContainer });
				canvasContainer.innerHTML = ''; 
				canvasContainer.appendChild(appInstance.canvas);
				pixiApp = appInstance;
				
				highwayGraphics = new Graphics(); appInstance.stage.addChild(highwayGraphics);
				lineGraphics = new Graphics(); appInstance.stage.addChild(lineGraphics);
				hitZoneGraphics = new Graphics(); appInstance.stage.addChild(hitZoneGraphics);
				beatLines = []; 
				const sortedHitObjects: Array<ChartHitObject & { id: number }> = [...(chart.hitObjects || [])]
					.sort((a, b) => a.time - b.time)
					.map((note, index) => ({ ...note, id: index }));
				noteGraphicsMap = new Map<number, NoteGraphicsEntry>();

				console.log('[EFFECT] PixiJS core initialized.');

				console.log('[EFFECT] Initializing Audio Element...');
				const localAudioInstance = new Audio(audioSrc);
				localAudioInstance.preload = 'auto';
				audioElement = localAudioInstance; 
				console.log('[EFFECT] audioElement created:', audioElement?.src);

				if (audioReactive) { audioReactive.cleanup(); audioReactive = null; }
				audioReactive = setupAudioReactiveBackground({
					appInstance,
					audioElement
				});

				if (!$isPaused && audioElement) {
					console.log('[EFFECT] Attempting initial audio play...');
					audioElement.play().then(() => {
						console.log('[EFFECT] Initial audio playback started.');
						if (audioReactive && audioReactive.audioContext && audioReactive.audioContext.state === 'suspended') {
							audioReactive.audioContext.resume().then(() => console.log('[EFFECT] AudioContext resumed after play.'));
						}
					}).catch(e => console.error("[EFFECT] Error during initial audio play:", e));
				} else {
					console.log('[EFFECT] Initial audio play skipped.');
				}

				updateLayout(); 

				gameLoop = (ticker) => {
					if (!appInstance || !pixiApp) return;
					const deltaMs = ticker.deltaMS;
					const MAX_DELTA_SECONDS = 1 / 30; 
					const cappedDeltaSeconds = Math.min(deltaMs / 1000, MAX_DELTA_SECONDS);

					if (audioElement) songTime = audioElement.currentTime * 1000;
					else songTime += deltaMs; 
				
					if (audioReactive) audioReactive.updateBackground();
					
					const currentSongTimeSeconds = songTime / 1000;
					const bpm = metadata.bpm > 0 ? metadata.bpm : 120;
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
							if (audioReactive && audioReactive.audioContext && audioReactive.audioContext.state === 'suspended') {
								audioReactive.audioContext.resume().then(() => console.log('[PauseEffect] AudioContext resumed.'));
							}
						}
					}
				}
			});

		}; 

		initGameplay().catch(err => console.error('[EFFECT] initGameplay promise rejected:', err));

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
			noteGraphicsMap.forEach((entry) => { 
				currentApp?.stage?.removeChild(entry.headGraphics); entry.headGraphics.destroy(); 
				if(entry.bodyGraphics){currentApp?.stage?.removeChild(entry.bodyGraphics); entry.bodyGraphics.destroy();}
			});
			noteGraphicsMap.clear();
			
			if (audioReactive) { audioReactive.cleanup(); audioReactive = null; }
			if (currentApp) { currentApp.destroy(true, { children: true }); pixiApp = null; }
			if(canvasContainer) canvasContainer.innerHTML = '';
			const audioToClean = audioElement; 
			if (audioToClean) { audioToClean.pause(); audioToClean.removeAttribute('src'); audioToClean.load(); }
			audioElement = null; 
			console.log('[EFFECT Cleanup] Main cleanup finished.');
		};
	}); 

</script>

<svelte:head>
	<title>Playing {metadata.title} by {metadata.artist} - MUG</title>
</svelte:head>

<div class="w-screen h-screen overflow-hidden relative bg-black">
	<div bind:this={canvasContainer} class="fixed top-0 left-0 w-full h-full z-0">
		{#if !pixiApp}
			<p class="absolute inset-0 flex items-center justify-center text-gray-400">Loading Gameplay...</p>
		{/if}
	</div>

	<LevitatingTextOverlay 
		title={metadata.title} 
		artist={metadata.artist} 
		difficultyName={chart.difficultyName} 
	/>
</div>

<style lang="postcss">
	:global(html, body) {
		overflow: hidden !important;
		height: 100% !important;
		margin: 0 !important;
		padding: 0 !important;
		background-color: #000; 
	}
</style> 