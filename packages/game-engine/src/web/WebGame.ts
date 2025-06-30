import { GameEngine, type GameEngineCallbacks, type GameEngineCorePhase } from '../core/GameEngine';
import { DEFAULT_CONFIG, type GameConfig } from '../config/GameConfig';
import type { GameplaySong } from '../types/ChartTypes';
import { initDevtools } from '@pixi/devtools';
import { Application, type ApplicationOptions } from 'pixi.js';
import { atom, computed, effect, map, type Atom } from 'nanostores';
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';


import * as PIXI from "pixi.js";
import { backgroundRendererFactory as backgroundRenderer, HoldNoteComponent, playfieldRenderer, TapNoteComponent } from '../rendering';
import { urlSoundFactory } from '../core/urlSoundFactory';
import type { IMediaInstance, Sound } from '@pixi/sound';

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

export interface WebGameCallbacks {
	onEngineCorePhaseChange?: (phase: GameEngineCorePhase) => void;
	onCountdownUpdate?: (count: number) => void;
	onScoreUpdate?: (playerId: string, score: number, combo: number, accuracy: number) => void;
	onNoteHit?: (noteId: number, judgment: string, score: number) => void;
	onNoteMiss?: (noteId: number) => void;
	onSongEnd?: () => void;
	onTimeUpdate?: (currentTimeMs: number) => void;
	onSongLoaded?: () => void;
	onSongLoadError?: (error: Error) => void;
}

export interface WebGameConfig {
	gameConfig?: Partial<GameConfig>;
	playerIds?: string[];
	songDurationMs?: number; // For progress bar calculation
}

type PartialPixiOptionsWithCanvasAndResizeTo = Partial<ApplicationOptions> & {
	canvas: HTMLCanvasElement;
	resizeTo: HTMLElement;
}

export class WebGame {
	// public gameEngine: GameEngine;
	private callbacks: WebGameCallbacks;

	currentSong = atom<GameplaySong | undefined>(undefined);
	
	currentSound = urlSoundFactory({
		url: computed(this.currentSong, (song) => song?.audioFilename),
	})
	
	pixiApp = new Application();
	screenSize = map({
		width: 1280,
		height: 720,
	})

	private backgroundRenderer = backgroundRenderer({
		screenSize: this.screenSize,
		imageUrl: computed(this.currentSong, (song) => song?.backgroundImageUrl),
	})

	private playfieldRenderer = playfieldRenderer({
		screenSize: this.screenSize,
		song: this.currentSong,
	});

	// Gameplay Note Timeline
	private timeline = gsap.timeline();



	constructor(pixiOptions: PartialPixiOptionsWithCanvasAndResizeTo, callbacks: WebGameCallbacks = {}, config: WebGameConfig = {}) {

		
		
		// #region Background
		this.pixiApp.stage.addChild(this.backgroundRenderer);
		this.backgroundRenderer.zIndex = -1000;
		// #endregion Background

		

		
		

		// #region Sound
		this.oncleanup.push(this.currentSound.cleanup);
		// #endregion Sound

		// #region PIXI Application
		this.pixiApp = new Application();
		setTimeout(() => {
			initDevtools({ app: this.pixiApp });
		}, 1000);

		this.pixiApp.init({
			backgroundColor: 0x000000,
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
			...pixiOptions,
		});

		this.oncleanup.push(() => {
			this.pixiApp.destroy();
		});
		// #endregion PIXI Application

		// #region Resize Observer

		const resizeObserver = new ResizeObserver((entries) => {
			entries.forEach((entry) => {

				this.screenSize.set({
					width: entry.contentRect.width,
					height: entry.contentRect.height,
				});
			});
		});

		resizeObserver.observe(pixiOptions.resizeTo);

		this.oncleanup.push(() => {
			resizeObserver.disconnect();
		});
		// #endregion Resize Observer


	
		// #region Playfield
		this.pixiApp.stage.addChild(this.playfieldRenderer);
		this.playfieldRenderer.zIndex = 1001;
		// #endregion Playfield
		
		// #region Timeline

		const noteContainer = new PIXI.Container();
		noteContainer.label = "NoteContainer";
		this.playfieldRenderer.addChild(noteContainer);
		noteContainer.zIndex = 1000;
		const approachDuration = 3;

		this.oncleanup.push(
			effect([this.currentSong, this.currentSound.isLoaded, this.currentSound.sound], (song, isLoaded, sound) => {
				if (!song || !isLoaded || !sound) return;
				console.log('Gameplay song updated', song);

				this.timeline.clear();
				this.timeline.pause();

				for (const hitObject of song.hitObjects) {

					
					const note = hitObject.noteInfo.type === "hold" ? new HoldNoteComponent({
						id: 1,
						lane: 1,
						timeMs: 0,
						noteInfo: hitObject.noteInfo,
						noteState: {
							noteType: "hold",
							state: {
								type: "waiting"
							}
						}
					}, -1) : new TapNoteComponent({
						id: 1,
						lane: hitObject.lane,
						timeMs: 0,
						noteInfo: hitObject.noteInfo,
						noteState: {
							noteType: "tap",
							state: {
								type: "waiting"
							}
						}
					}, -1);

					note.visible = false;
					// noteContainer.addChild(note);
					const hitTime = (hitObject.timeMs / 1000);
					
					this.timeline.to(note, {
						pixi: {
							y: 768 * 0.8,
							visible: true,
						},
						duration: approachDuration,
						ease: "none",
						onStart: () => {
							noteContainer.addChild(note);
						},
						startAt: {
							y: -100,
							x: (hitObject.lane * 100),
							visible: false,
						},
						// onComplete: () => {
						// 	console.log("Note hit!");
						// 	tapNote.visible = false;
						// }
					}, hitTime);
					
					// then fast swipe down
					this.timeline.to(note, {
						pixi: {
							y: 1000,
						},
						duration: 0.1,
						ease: "none",
					}, hitTime + approachDuration);

				}
				
				const timelineManager = (ctx: {
					timeline: GSAPTimeline,
					sound: Sound,
					context: Sound,
					approachDuration: number,
				}) => {
					let startTime: number | null = null;
					let mediaInstance: IMediaInstance | null = null;
					let isPlaying = false;
					let tickerCallback: () => void;
					let audioStartTimeout: NodeJS.Timeout | null = null;

					tickerCallback = () => {
						if (!startTime || !isPlaying) return;
						
						const elapsed = Date.now() - startTime;
						
						if (!mediaInstance) {
							ctx.timeline.time(elapsed / 1000);
						} else {
							ctx.timeline.time(approachDuration + (mediaInstance.progress ?? 0) * ctx.sound.duration);
						}
					};

					const cleanupAudioTimeout = () => {
						if (audioStartTimeout) {
							clearTimeout(audioStartTimeout);
							audioStartTimeout = null;
						}
					};

					return {
						start: async () => {
							// Cleanup any existing timeout to prevent multiple audio instances
							cleanupAudioTimeout();
							
							if (mediaInstance) {
								mediaInstance.stop();
								mediaInstance = null;
							}

							startTime = Date.now();
							isPlaying = true;
							
							ctx.timeline.time(0);
							ctx.timeline.play();
							
							this.pixiApp.ticker.add(tickerCallback);
							
							// Start audio after approach duration
							audioStartTimeout = setTimeout(async () => {
								mediaInstance = await ctx.sound.play();
								audioStartTimeout = null;
							}, ctx.approachDuration * 1000);
						},
						pause: () => {
							isPlaying = false;
							cleanupAudioTimeout();
							ctx.timeline.pause();
							if (mediaInstance) {
								mediaInstance.paused = true;
							}
						},
						resume: () => {
							if (!startTime) return;
							isPlaying = true;
							ctx.timeline.play();
							if (mediaInstance) {
								mediaInstance.paused = false;
							}
						},
						stop: () => {
							isPlaying = false;
							startTime = null;
							cleanupAudioTimeout();
							ctx.timeline.time(0);
							ctx.timeline.pause();
							mediaInstance?.stop();
							this.pixiApp.ticker.remove(tickerCallback);
							mediaInstance = null;
						}
					}
				}

				const timeline = timelineManager({
					timeline: this.timeline,
					sound,
					context: sound,
					approachDuration: approachDuration,
				});

				timeline.start();

			})
		);

		

		// #endregion Timeline

		this.pixiApp.stage.addChild(this.backgroundRenderer);


		this.callbacks = callbacks;

		// Merge provided config with defaults
		const gameConfig: GameConfig = {
			...DEFAULT_CONFIG,
			...config.gameConfig
		};

		// Create GameEngine callbacks that bridge to web callbacks
		const engineCallbacks: GameEngineCallbacks = {
			onEngineCorePhaseChange: this.callbacks.onEngineCorePhaseChange,
			onScoreUpdate: this.callbacks.onScoreUpdate,
			onNoteHit: this.callbacks.onNoteHit,
			onNoteMiss: this.callbacks.onNoteMiss,
			onGameplayCountdownUpdate: this.callbacks.onCountdownUpdate,
			onGameEnd: () => this.callbacks.onSongEnd?.(),
			onSongLoaded: this.callbacks.onSongLoaded,
			onSongLoadError: this.callbacks.onSongLoadError,
			onSongTimeUpdate: this.callbacks.onTimeUpdate,
		};

		// this.gameEngine = new GameEngine(gameConfig, engineCallbacks);
		// this.renderer = new MainGameRenderer(this.pixiApp, screenWidth, screenHeight, song);
	}

	




	public oncleanup: (() => void)[] = [];


	// Cleanup
	public cleanup(): void {
		this.backgroundRenderer.destroy();
		this.oncleanup.forEach(callback => callback());
	}
} 