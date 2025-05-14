<script lang="ts">
	import { Colors, GameplaySizing, Timing } from '$lib/gameplayConstants';
	import { drawHighway, drawHighwayLines, drawHitZone, redrawBeatLineGraphicsOnResize, redrawNoteGraphicsOnResize, updateBeatLines, updateNotes, updateKeyPressVisuals } from '$lib/rendering';
	import { isPaused, masterVolume, musicVolume } from '$lib/stores/settingsStore';
	import type { BeatLineEntry, ChartHitObject, NoteType, NoteGraphicsEntry } from '$lib/types';
	import { Application, Graphics, Color, Text, TextStyle, Container } from 'pixi.js';
	import type { PageData } from './$types';
	import LevitatingTextOverlay from '$lib/LevitatingTextOverlay.svelte';
	import { setupAudioReactiveBackground } from '$lib/useAudioReactiveBackground';
	import PauseOverlay from '$lib/components/PauseOverlay.svelte';

	let { data } = $props<{ data: PageData }>(); 

	// Hit Timing Windows (in milliseconds, +/- around the exact note time)
	const TIMING_PERFECT_MS = 20;
	const TIMING_GREAT_MS = 40;
	const TIMING_GOOD_MS = 100;
	const TIMING_MISS_MS = 250; // Also serves as the overall hit window boundary

	let pixiApp = $state<Application | null>(null);
	let canvasContainer: HTMLDivElement;
	let audioElement = $state<HTMLAudioElement | null>(null);
	let beatLines = $state<BeatLineEntry[]>([]);
	let songTime = $state(0);

	let noteGraphicsMap = $state(new Map<number, NoteGraphicsEntry>());

	const BASE_SCROLL_SPEED = 300; // Base pixels per second for scroll speed
	const scrollSpeed = $derived(BASE_SCROLL_SPEED * data.chart.noteScrollSpeed);

	let audioReactive: ReturnType<typeof setupAudioReactiveBackground> | null = null;

	const { songId, metadata, chart } = data;
	const audioSrc = `/songs/${songId}/${metadata.audioFilename}`;

	// --- Input Handling State ---
	const KEY_MAPS: Array<Record<string, number>> = [
		{ 'KeyD': 0, 'KeyF': 1, 'KeyJ': 2, 'KeyK': 3 }, // 4-lane default
		{ 'KeyS':0, 'KeyD': 1, 'KeyF':2, 'KeyJ':3, 'KeyK':4, 'KeyL':5}, // 6-lane example
	];
	// Initialize with a default, will be refined by chart.lanes in $effect
	let currentKeyMap = $state<Record<string, number>>(KEY_MAPS[0] || {});

	// Dynamically initialize based on chart.lanes from `data` prop
	let lanePressedState = $state(Array(data.chart.lanes).fill(false));
	let laneActivationVisuals = $state(
		Array(data.chart.lanes).fill(null).map(() => ({ activationTime: 0, currentAlpha: 0 }))
	);
	// Optional: For logging or more complex input logic later
	let keyPressLog = $state<Array<{ lane: number; timeMs: number; type: 'down' | 'up', key: string }>>([]);
	// --- End Input Handling State ---

	let keyPressEffectGraphics: Graphics | null = null; // Graphics layer for key press effects

	// --- Judgment Text State ---
	type JudgmentTextInfo = {
		instanceId: number; // Unique ID for the text graphics instance
		pixiText: Text;
		text: string;
		color: number;
		x: number;
		y: number;
		alpha: number;
		velocityY: number;
		remainingLifetimeMs: number;
	};
	let judgmentTextMap = $state(new Map<number, JudgmentTextInfo>());
	let nextJudgmentTextInstanceId = 0;
	let judgmentTextContainer: Container | null = null; // PixiJS container for judgment texts
	const JUDGMENT_TEXT_DURATION_MS = 600;
	const JUDGMENT_TEXT_INITIAL_VELOCITY_Y = -80; // pixels per second
	const JUDGMENT_TEXT_FADE_RATE = 1.5; // Alpha per second (1 / (DURATION_MS/1000))
	// --- End Judgment Text State ---

	let judgedNoteIds = $state(new Set<number>()); // Set to track IDs of notes already judged (hit or miss)

	function spawnJudgmentText(
		type: "PERFECT" | "GREAT" | "GOOD" | "EARLY" | "LATE" | "MISS", 
		laneNumber: number, 
		hitZoneY: number, 
		laneWidth: number, 
		highwayX: number
	) {
		if (!judgmentTextContainer || !pixiApp) return;

		let color: number;
		switch (type) {
			case "PERFECT": color = Colors.JUDGMENT_PERFECT; break;
			case "GREAT": color = Colors.JUDGMENT_GREAT; break;
			case "GOOD": color = Colors.JUDGMENT_GOOD; break;
			case "EARLY": color = Colors.JUDGMENT_EARLY; break;
			case "LATE": color = Colors.JUDGMENT_LATE; break;
			case "MISS": color = Colors.JUDGMENT_MISS; break;
			default: color = Colors.JUDGMENT_MISS; // Fallback
		}

		const textStyle = new TextStyle({
			fontFamily: 'Arial',
			fontSize: 24,
			fontWeight: 'bold',
			fill: color,
			stroke: { color: '#000000', width: 2 }
		});

		const pixiText = new Text({text: type, style: textStyle});
		pixiText.anchor.set(0.5);
		pixiText.x = highwayX + (laneNumber * laneWidth) + (laneWidth / 2);
		pixiText.y = hitZoneY - 30; // Spawn slightly above the hit zone
		pixiText.alpha = 1.0;

		judgmentTextContainer.addChild(pixiText);

		const instanceId = nextJudgmentTextInstanceId++;
		const newTextInfo: JudgmentTextInfo = {
			instanceId,
			pixiText,
			text: type,
			color: color, // Use determined color
			x: pixiText.x,
			y: pixiText.y,
			alpha: 1.0,
			velocityY: JUDGMENT_TEXT_INITIAL_VELOCITY_Y,
			remainingLifetimeMs: JUDGMENT_TEXT_DURATION_MS
		};
		judgmentTextMap.set(instanceId, newTextInfo);
	}

	$effect(() => {
		// Update keymap based on actual chart lanes
		if (data.chart.lanes === 4 && KEY_MAPS[0]) {
			currentKeyMap = KEY_MAPS[0];
		} else if (data.chart.lanes === 6 && KEY_MAPS[1]) {
			currentKeyMap = KEY_MAPS[1];
		} else {
			console.warn(`No specific keymap for ${data.chart.lanes} lanes. Using 4-lane default if available, or empty if not.`);
			currentKeyMap = KEY_MAPS[0] || {}; // Fallback to 4-lane default or an empty map
		}
		
		// Ensure state arrays are correctly sized if chart data implies different lane count
		// This check is mostly for robustness, as props for this page typically don't change post-initialization.
		if (lanePressedState.length !== data.chart.lanes) {
			lanePressedState = Array(data.chart.lanes).fill(false);
		}
		if (laneActivationVisuals.length !== data.chart.lanes) {
			laneActivationVisuals = Array(data.chart.lanes).fill(null).map(() => ({ activationTime: 0, currentAlpha: 0 }));
		}
	});

	$effect(() => {
		let appInstance: Application | null = null;
		let gameLoop: ((ticker: any) => void) | null = null;
		let unsubscribePaused: (() => void) | null = null; 

		let highwayGraphics: Graphics | null = null;
		let lineGraphics: Graphics | null = null;
		let hitZoneGraphics: Graphics | null = null;
		// keyPressEffectGraphics is part of component state now, accessed directly

		// --- Keyboard Event Listeners for Input Handling ---
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.repeat || Object.keys(currentKeyMap).length === 0 || !pixiApp || !appInstance) return;
			const targetLane = currentKeyMap[event.code];

			if (targetLane !== undefined && targetLane < chart.lanes) {
				// Visual press effect
				if (!lanePressedState[targetLane]) { 
					const newLanePressedState = lanePressedState.with(targetLane, true);
					lanePressedState = newLanePressedState;
					const newVisuals = laneActivationVisuals.with(targetLane, { activationTime: songTime, currentAlpha: 1.0 });
					laneActivationVisuals = newVisuals;
				}

				const hitWindowMs = Timing.HIT_WINDOW_MS;
				let bestCandidate: { id: number, entry: NoteGraphicsEntry, timeDiffAbs: number, actualTimeDiff: number } | null = null;

				for (const [noteId, noteEntry] of noteGraphicsMap) {
					if (!judgedNoteIds.has(noteId) && noteEntry.lane === targetLane && !noteEntry.isHit) {
						const actualTimeDifference = (songTime) - noteEntry.time; // player time - note time
						const timeDifferenceAbs = Math.abs(actualTimeDifference);

						// Use TIMING_MISS_MS as the widest possible window for a key press to be associated with a note
						if (timeDifferenceAbs <= TIMING_MISS_MS) { 
							if (!bestCandidate || timeDifferenceAbs < bestCandidate.timeDiffAbs) {
								bestCandidate = { id: noteId, entry: noteEntry, timeDiffAbs: timeDifferenceAbs, actualTimeDiff: actualTimeDifference };
							}
						}
					}
				}

				if (bestCandidate) {
					const { id: hitNoteId, entry: hitNoteEntry, timeDiffAbs, actualTimeDiff } = bestCandidate;
					
					if (!judgedNoteIds.has(hitNoteId)) { 
						judgedNoteIds.add(hitNoteId);
						judgedNoteIds = new Set(judgedNoteIds);

						hitNoteEntry.isHit = true; 
						noteGraphicsMap = new Map(noteGraphicsMap);

						let judgmentType: "PERFECT" | "GREAT" | "GOOD" | "EARLY" | "LATE" | "MISS" | null = null;

						if (timeDiffAbs <= TIMING_PERFECT_MS) {
							judgmentType = "PERFECT";
						} else if (timeDiffAbs <= TIMING_GREAT_MS) {
							judgmentType = "GREAT";
						} else if (timeDiffAbs <= TIMING_GOOD_MS) {
							judgmentType = "GOOD";
						} else if (timeDiffAbs <= TIMING_MISS_MS) { // This is the 101ms to TIMING_MISS_MS (e.g., 250ms) window
							if (actualTimeDiff < 0) { // player time is less than note time, so pressed early
								judgmentType = "EARLY";
							} else { // player time is greater than note time, so pressed late
								judgmentType = "LATE";
							}
						}
						// If judgmentType is still null here, it means the press was outside TIMING_MISS_MS for this note.
						// The bestCandidate logic already ensures we only consider notes within TIMING_MISS_MS.
						// So, a judgmentType should always be assigned if we reach here for a bestCandidate.

						if (judgmentType) {
							spawnJudgmentText(
								judgmentType, 
								targetLane, 
								pixiApp.screen.height * GameplaySizing.HIT_ZONE_Y_RATIO, 
								(pixiApp.screen.width * GameplaySizing.HIGHWAY_WIDTH_RATIO) / chart.lanes, 
								(pixiApp.screen.width * (1 - GameplaySizing.HIGHWAY_WIDTH_RATIO)) / 2
							);
							// TODO: Add score, combo based on judgmentType
						}
					}
				}
			}
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			if (Object.keys(currentKeyMap).length === 0) return;
			const lane = currentKeyMap[event.code];

			if (lane !== undefined && lane < chart.lanes) {
				if (lanePressedState[lane]) { 
					const newLanePressedState = lanePressedState.with(lane, false);
					lanePressedState = newLanePressedState;

					const releaseData = { lane, timeMs: songTime, type: 'up' as const, key: event.code };
					keyPressLog = [...keyPressLog, releaseData];
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		// --- End Keyboard Event Listeners ---

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
				keyPressEffectGraphics = new Graphics(); appInstance.stage.addChild(keyPressEffectGraphics);
				judgmentTextContainer = new Container(); appInstance.stage.addChild(judgmentTextContainer); // Create and add container

				beatLines = []; 
				const sortedHitObjects: Array<ChartHitObject & { id: number }> = [...(chart.hitObjects || [])]
					.sort((a, b) => a.time - b.time)
					.map((note, index) => ({ ...note, id: index }));
				noteGraphicsMap = new Map<number, NoteGraphicsEntry>();
				judgedNoteIds.clear(); // Clear for new game
				// Ensure $judgedNoteIds = new Set(); if needed for reactivity if clear() isn't enough.
				// For Svelte 5, judgedNoteIds.clear() should be fine if judgedNoteIds itself is $state.
				// To be absolutely safe for reactivity of consumers of the set itself, use: judgedNoteIds = new Set();
				judgedNoteIds = new Set(); // Safer for ensuring reactivity on reset

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

					// Update Beat Lines
					const newBeatLinesState = updateBeatLines(
						currentSongTimeSeconds, bpm, scrollSpeed, cappedDeltaSeconds,
						stageDimensions, highwayX, highwayWidth, playheadY,
						beatLines, appInstance.stage 
					);
					if (newBeatLinesState.length !== beatLines.length || newBeatLinesState.some((val, i) => val !== beatLines[i])) {
						beatLines = newBeatLinesState; 
					}

					// Update Notes
					const noteCtx = {
						songTimeMs: songTime, scrollSpeed, stage: stageDimensions, lanes: chart.lanes,
						highwayX, highwayWidth, laneWidth: highwayWidth / chart.lanes,
						hitZoneY: playheadY, pixiStage: appInstance.stage, deltaSeconds: cappedDeltaSeconds
					};
					// Pass judgedNoteIds to updateNotes
					const newNoteMapState = updateNotes(noteCtx, sortedHitObjects, noteGraphicsMap, judgedNoteIds);
					if (newNoteMapState !== noteGraphicsMap || newNoteMapState.size !== noteGraphicsMap.size) {
					    noteGraphicsMap = newNoteMapState;
					}

					// --- Miss Detection (after updateNotes) ---
					// A note is a "MISS" if its time + TIMING_MISS_MS has passed and it hasn't been hit by a key press.
					let mutatedInMissDetection = false;
					noteGraphicsMap.forEach((noteEntry, noteId) => {
						// Check if note is beyond the miss window (songTime > note.time + TIMING_MISS_MS)
						// and it hasn't been judged yet.
						if (!judgedNoteIds.has(noteId) && !noteEntry.isHit && (songTime - noteEntry.time) > TIMING_MISS_MS) {
							judgedNoteIds.add(noteId);

							// Marking isHit = true here means it's processed, to prevent re-judging.
							// For a pure miss, the note wasn't "hit" by the player, but it's "hit" by the timeline.
							noteEntry.isHit = true; 
							spawnJudgmentText("MISS", noteEntry.lane, playheadY, noteCtx.laneWidth, noteCtx.highwayX);
							mutatedInMissDetection = true;
						}
					});
					if (mutatedInMissDetection) {
						// If any note had its isHit mutated, or if judgedNoteIds was added to, update maps/sets
						noteGraphicsMap = new Map(noteGraphicsMap); 
						judgedNoteIds = new Set(judgedNoteIds); // Update judgedNoteIds set reference too
					}
					// --- End Miss Detection ---

					// Update Key Press Visuals
					if (keyPressEffectGraphics && chart.lanes > 0) {
						updateKeyPressVisuals(
							keyPressEffectGraphics,
							laneActivationVisuals,
							lanePressedState,
							chart.lanes,
							highwayWidth / chart.lanes, // laneWidth
							highwayX,
							playheadY, // hitZoneY
							cappedDeltaSeconds,
							Colors.NOTE_TAP // Color for the effect
						);
					}

					// --- Update Judgment Texts ---
					if (judgmentTextContainer && judgmentTextMap.size > 0) {
						const deadTexts: number[] = [];
						judgmentTextMap.forEach((jt, id) => {
							jt.pixiText.y += jt.velocityY * cappedDeltaSeconds;
							jt.pixiText.alpha -= JUDGMENT_TEXT_FADE_RATE * cappedDeltaSeconds;
							jt.remainingLifetimeMs -= deltaMs;

							if (jt.remainingLifetimeMs <= 0 || jt.pixiText.alpha <= 0) {
								deadTexts.push(id);
								judgmentTextContainer!.removeChild(jt.pixiText);
								jt.pixiText.destroy();
							}
						});
						if (deadTexts.length > 0) {
							const newMap = new Map(judgmentTextMap);
							deadTexts.forEach(id => newMap.delete(id));
							judgmentTextMap = newMap;
						}
					}
					// --- End Update Judgment Texts ---
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
			window.removeEventListener('keydown', handleKeyDown); // Cleanup keydown listener
			window.removeEventListener('keyup', handleKeyUp);   // Cleanup keyup listener

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
			if (keyPressEffectGraphics) { currentApp?.stage?.removeChild(keyPressEffectGraphics); keyPressEffectGraphics.destroy(); keyPressEffectGraphics = null; }
			if (judgmentTextContainer) { // Cleanup judgment texts and container
				judgmentTextMap.forEach(jt => judgmentTextContainer?.removeChild(jt.pixiText));
				judgmentTextMap.clear();
				currentApp?.stage?.removeChild(judgmentTextContainer); 
				judgmentTextContainer.destroy(); 
				judgmentTextContainer = null;
			}
			
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
		songTimeMs={songTime}
		bpm={metadata.bpm > 0 ? metadata.bpm : 120}
	/>

	<PauseOverlay />
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