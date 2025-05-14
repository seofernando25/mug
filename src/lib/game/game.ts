import { Application, Container } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import { Sound, type IMediaInstance } from '@pixi/sound'; // Using type-only import for IMediaInstance
import { GameplaySizing, Colors } from './index'; // Assuming GameplaySizing and Colors are exported
import {
    drawBeatLines,
    drawHighway,
    drawJudgmentText,
    drawKeyPressEffects,
    drawNotes,
    drawReceptor,
    updateKeyPressVisuals,
    type BeatLineGraphics,
    type HighwayGraphics,
    type JudgmentText,
    type KeyPressEffectGraphics,
    type NoteGraphics,
    type ReceptorGraphics
} from '$lib/rendering'; // Ensure rendering functions are imported
import type { SongData, ChartData, Note } from './types';
import { Preferences } from '$lib/preferences';

export type GamePhase = 'loading' | 'countdown' | 'playing' | 'finished' | 'summary';

export interface GameCallbacks {
    onPhaseChange: (phase: GamePhase) => void;
    onCountdownUpdate: (value: number) => void;
    onSongEnd: () => void;
    onScoreUpdate: (score: number, combo: number, maxCombo: number) => void;
    onNoteHit: (note: Note, judgment: string) => void;
    onNoteMiss: (note: Note) => void;
    getGamePhase: () => GamePhase;
    getIsPaused: () => boolean;
    getCountdownValue: () => number;
    onTimeUpdate?: (currentTimeMs: number) => void; // Added for live time updates
}

export interface GameInstance {
    // --- Control Functions ---
    // startSong: () => void; // This will be part of initial setup or a resetGame method
    initialize: (canvasElement: HTMLCanvasElement) => Promise<void>;
    pauseGame: () => void;
    resumeGame: () => void;
    handleKeyPress: (key: string, event: KeyboardEvent) => void;
    handleKeyRelease: (key: string, event: KeyboardEvent) => void;
    handleResize: () => void;
    cleanup: () => void;

    // --- State Accessors (if needed, or prefer callbacks for UI updates) ---
    getCurrentPhase: () => GamePhase;
    // getCurrentScore: () => { score: number; combo: number; maxCombo: number }; // Covered by onScoreUpdate callback
    isPaused: () => boolean;
    // New method to explicitly start the song sequence (loading, countdown, play)
    beginGameplaySequence: () => void;
}

interface GameState {
    phase: GamePhase;
    isPaused: boolean;
    sound: Sound | null; // Using imported Sound type
    soundInstance: IMediaInstance | null; // Using imported IMediaInstance type
    songData: SongData;
    chartData: ChartData;
    // pixiApp: Application; // Will be initialized and managed within GameState
    callbacks: GameCallbacks;

    // Gameplay state
    currentSongTimeMs: number;
    gameTimeStartMs: number; // System time when 'playing' phase began
    countdownValue: number;
    currentScore: number;
    currentCombo: number;
    maxComboSoFar: number;
    notes: Note[]; // Processed notes with timing info
    upcomingNoteIndex: number;

    // Timers
    countdownIntervalId: any | null;
    finishAnimationTimerId: any | null;

    // --- PixiJS Application and Graphics Elements ---
    pixiApp: Application | null;
    mainContainer: Container | null;
    highwayGraphics: HighwayGraphics | null;
    receptorGraphics: ReceptorGraphics | null;
    noteGraphics: NoteGraphics[];
    beatLineGraphics: BeatLineGraphics | null;
    keyPressEffectGraphics: KeyPressEffectGraphics | null;
    judgmentTexts: JudgmentText[];
    canvasElementRef: HTMLCanvasElement | null; // Keep a reference if needed for resize

    // --- Key state ---
    keyStates: Record<string, boolean>;
    globalSpeedMultiplier: number;
    lastKnownBpm: number;
}

export function createGame(
    songData: SongData,
    chartData: ChartData,
    // pixiApp: Application, // PixiApp will be created internally
    callbacks: GameCallbacks
    // initialAudioElement?: HTMLAudioElement, // Will be passed in initialize
): GameInstance {
    const state: GameState = {
        phase: 'loading',
        isPaused: false,
        sound: null,
        soundInstance: null,
        songData,
        chartData,
        // pixiApp: pixiApp, // Initialized in `initialize`
        callbacks,
        currentSongTimeMs: 0,
        gameTimeStartMs: 0,
        countdownValue: 3,
        currentScore: 0,
        currentCombo: 0,
        maxComboSoFar: 0,
        notes: [],
        upcomingNoteIndex: 0,
        countdownIntervalId: null,
        finishAnimationTimerId: null,
        // PixiJS elements
        pixiApp: null,
        mainContainer: null,
        highwayGraphics: null,
        receptorGraphics: null,
        noteGraphics: [],
        beatLineGraphics: null,
        keyPressEffectGraphics: null,
        judgmentTexts: [],
        canvasElementRef: null,
        // Key states & game params
        keyStates: {},
        globalSpeedMultiplier: Preferences.prefs.gameplay.speedMultiplier,
        lastKnownBpm: chartData.timing.bpms[0]?.bpm || 60,
    };

    // --- Internal Helper Functions ---
    function setPhase(newPhase: GamePhase) {
        state.phase = newPhase;
        state.callbacks.onPhaseChange(newPhase);
        console.log(`Game phase changed to: ${newPhase}`);

        if (state.pixiApp) {
            if (newPhase === 'playing' || newPhase === 'countdown') {
                if (!state.isPaused) state.pixiApp.ticker.start();
            } else {
                state.pixiApp.ticker.stop();
            }
        }
    }

    async function _setupPixiApp(element: HTMLCanvasElement) {
        const pixiAppInstance = new Application();

        const container = element.parentElement;
        // Use defaults from GameplaySizing as fallbacks if container is not found,
        // though GameplaySizing itself might need to expose these defaults or handle undefined.
        // For now, assuming GameplaySizing.getGameplaySizing can take potentially undefined
        // and fall back to its own defaults, OR we provide fallbacks here.
        // Let's provide clear fallbacks here for robustness before calling.
        let currentWidth = 800; // Fallback width
        let currentHeight = 600; // Fallback height

        if (container) {
            currentWidth = container.clientWidth;
            currentHeight = container.clientHeight;
        }

        // Pass the actual container dimensions to getGameplaySizing
        const sizing = GameplaySizing.getGameplaySizing(currentWidth, currentHeight);

        await pixiAppInstance.init({
            canvas: element,
            width: sizing.width, // Use width from dynamic sizing
            height: sizing.height, // Use height from dynamic sizing
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            backgroundColor: 0x000000,
            backgroundAlpha: 0.5
        });

        state.pixiApp = pixiAppInstance;
        state.mainContainer = new Container();
        state.pixiApp.stage.addChild(state.mainContainer);

        const highwayMetrics = GameplaySizing.getHighwayMetrics(state.chartData.numLanes, sizing.width, sizing.height);
        const receptorPositions = GameplaySizing.getReceptorPositions(highwayMetrics, sizing.width, sizing.height);
        const receptorSize = GameplaySizing.getReceptorSize(sizing.width, sizing.height);

        state.highwayGraphics = drawHighway(state.pixiApp, state.mainContainer, highwayMetrics);
        state.receptorGraphics = drawReceptor(state.pixiApp, state.mainContainer, receptorPositions, receptorSize);
        state.keyPressEffectGraphics = drawKeyPressEffects(
            state.pixiApp,
            state.mainContainer,
            receptorPositions,
            receptorSize,
            state.chartData.numLanes
        );
        state.beatLineGraphics = drawBeatLines(
            state.pixiApp,
            state.mainContainer,
            highwayMetrics,
            [], // Empty beats initially
            0,
            0,
            state.globalSpeedMultiplier
        );
        state.canvasElementRef = element; // Store for resize
    }

    function _renderLoopContent(currentTimeMs: number, currentBpm: number) {
        if (!state.pixiApp || !state.mainContainer || !state.highwayGraphics) return;
        // Use callbacks to get current phase and pause state from Svelte store via +page.svelte
        const currentPhase = state.callbacks.getGamePhase();
        const isPaused = state.callbacks.getIsPaused();

        if (isPaused && currentPhase !== 'playing' && currentPhase !== 'countdown') return;

        // Recalculate sizing based on current canvas dimensions for the render loop
        // This ensures that if a resize happened, subsequent calculations are correct.
        // The actual renderer resize is handled in handleResize.
        // This is for metrics used in drawing calculations within the loop.
        const container = state.canvasElementRef?.parentElement;
        let currentWidth = state.pixiApp.screen.width; // Use current renderer width as default
        let currentHeight = state.pixiApp.screen.height; // Use current renderer height as default
        if (container) {
            currentWidth = container.clientWidth;
            currentHeight = container.clientHeight;
        }
        const sizing = GameplaySizing.getGameplaySizing(currentWidth, currentHeight);


        const highwayMetrics = GameplaySizing.getHighwayMetrics(state.chartData.numLanes, sizing.width, sizing.height);
        const noteSize = GameplaySizing.getNoteSize(sizing.width, sizing.height); // Assuming getNoteSize might also become dynamic

        if (state.beatLineGraphics) {
            drawBeatLines(
                state.pixiApp,
                state.mainContainer,
                highwayMetrics,
                state.chartData.timing.beats || [],
                currentTimeMs,
                currentBpm,
                state.globalSpeedMultiplier,
                state.beatLineGraphics
            );
        }

        const visibleNotes = state.chartData.notes.filter((note: Note) => {
            const noteY = GameplaySizing.getNoteYPosition(
                note.time,
                currentTimeMs,
                highwayMetrics.receptorYPosition,
                state.globalSpeedMultiplier,
                currentBpm
            );
            return noteY > -noteSize.height && noteY < state.pixiApp!.screen.height;
        });

        state.noteGraphics = drawNotes(
            state.pixiApp,
            state.mainContainer,
            visibleNotes,
            currentTimeMs,
            highwayMetrics,
            state.globalSpeedMultiplier,
            currentBpm,
            state.noteGraphics
        );

        if (state.keyPressEffectGraphics && highwayMetrics) {
            const lanePressedStates = Preferences.prefs.gameplay.keybindings.map(
                (key) => !!state.keyStates[key.toLowerCase()]
            );
            updateKeyPressVisuals(
                state.keyPressEffectGraphics.visuals,
                state.keyPressEffectGraphics.laneData,
                lanePressedStates,
                state.chartData.numLanes,
                highwayMetrics.laneWidth,
                highwayMetrics.x,
                highwayMetrics.receptorYPosition,
                state.pixiApp.ticker.deltaMS / 1000,
                Colors.HIT_ZONE_CENTER
            );
        }

        state.judgmentTexts = state.judgmentTexts.filter((jt) => {
            jt.updateAnimation(state.pixiApp!.ticker.deltaMS);
            return jt.alpha > 0;
        });
    }

    function _spawnVisualJudgment(note: Note, judgment: string) {
        if (!state.pixiApp || !state.mainContainer) return;
        const highwayMetrics = GameplaySizing.getHighwayMetrics(state.chartData.numLanes);
        const newJudgment = drawJudgmentText(
            state.pixiApp,
            state.mainContainer,
            judgment,
            note.lane,
            state.chartData.numLanes,
            highwayMetrics.judgmentLineYPosition
        );
        state.judgmentTexts.push(newJudgment);
    }

    function loadAudio() {
        if (state.soundInstance) {
            state.soundInstance.destroy();
            state.soundInstance = null;
        }
        if (state.sound) {
            state.sound.destroy();
            state.sound = null;
        }

        console.log('Loading audio with @pixi/sound:', state.songData.audioUrl);
        try {
            // Use the imported Sound class directly
            state.sound = Sound.from({
                url: state.songData.audioUrl,
                preload: true,
                loaded: (err: Error | null, loadedSound?: Sound) => { // Use imported Sound type
                    if (err) {
                        console.error('@pixi/sound error loading sound:', err);
                        setPhase('loading');
                        return;
                    }
                    if (!loadedSound) {
                        console.error('@pixi/sound loaded callback: sound resource is null or undefined');
                        setPhase('loading');
                        return;
                    }
                    state.sound = loadedSound;
                    console.log('@pixi/sound: Audio loaded. Duration:', state.sound.duration, 's');
                    if (state.phase === 'loading') {
                        setPhase('countdown');
                        startCountdown();
                    }
                }
            });
        } catch (e) {
            console.error("Error initiating @pixi/sound Sound.from:", e);
            setPhase('loading');
        }
    }

    function startCountdown() {
        setPhase('countdown');
        state.countdownValue = 3;
        state.callbacks.onCountdownUpdate(state.countdownValue);

        if (state.countdownIntervalId) clearInterval(state.countdownIntervalId);
        state.countdownIntervalId = setInterval(() => {
            state.countdownValue--;
            state.callbacks.onCountdownUpdate(state.countdownValue);
            if (state.countdownValue <= 0) {
                clearInterval(state.countdownIntervalId);
                state.countdownIntervalId = null;
                if (state.sound && state.sound.isLoaded && state.phase === 'countdown') {
                    try {
                        // play() might return an instance or a Promise for an instance
                        const instanceOrPromise = state.sound.play();
                        Promise.resolve(instanceOrPromise).then((instance: IMediaInstance) => { // Use imported IMediaInstance
                            if (!instance) {
                                console.error("@pixi/sound.play did not yield a valid instance.");
                                setPhase('loading');
                                return;
                            }
                            state.soundInstance = instance;
                            state.soundInstance.on('end', () => {
                                console.log('@pixi/sound: Audio instance ended');
                                if (state.phase === 'playing') {
                                    setPhase('finished');
                                    state.callbacks.onSongEnd();
                                    if (state.finishAnimationTimerId) clearTimeout(state.finishAnimationTimerId);
                                    state.finishAnimationTimerId = setTimeout(() => {
                                        setPhase('summary');
                                    }, 2000);
                                }
                            });
                            // state.soundInstance.on('progress', (progress: number) => {});

                            state.gameTimeStartMs = performance.now();
                            state.currentSongTimeMs = 0;
                            setPhase('playing');

                        }).catch(err => {
                            console.error("Error resolving sound instance from play():", err);
                            setPhase('loading');
                        });
                    } catch (e) {
                        console.error("Error playing sound with @pixi/sound:", e);
                        setPhase('loading');
                    }
                } else if (state.phase === 'countdown') {
                    console.warn('In countdown, but sound not ready or not in correct phase to play.');
                }
            }
        }, 1000);
    }

    function processNotes() {
        state.notes = chartData.notes.map((note: any) => ({ ...note })).sort((a: any, b: any) => a.time - b.time);
        state.upcomingNoteIndex = 0;
        state.notes.forEach(note => {
            note.isHit = false;
            note.isMissed = false;
        });
    }

    const MISS_WINDOW_MS = 200; // Default miss window after note time

    function updateGameLoop(ticker: Ticker) {
        if (!state.pixiApp || state.phase === 'loading') return;

        const currentPhase = state.callbacks.getGamePhase();
        const isPaused = state.callbacks.getIsPaused();

        if (currentPhase === 'playing' && !isPaused) {
            if (state.sound && state.soundInstance && state.sound.isLoaded) {
                const progress = state.soundInstance.progress;
                const duration = state.sound.duration;
                if (typeof progress === 'number' && typeof duration === 'number' && duration > 0) {
                    state.currentSongTimeMs = progress * duration * 1000;
                } else if (state.gameTimeStartMs > 0) { // Fallback if progress/duration not valid yet
                    state.currentSongTimeMs = performance.now() - state.gameTimeStartMs;
                }
            } else if (state.gameTimeStartMs > 0 && state.phase === 'playing') {
                state.currentSongTimeMs = performance.now() - state.gameTimeStartMs;
            }

            if (state.callbacks.onTimeUpdate) {
                state.callbacks.onTimeUpdate(state.currentSongTimeMs);
            }

            let currentBpm = state.lastKnownBpm;
            const currentTimingPoint = state.chartData.timing.bpms.findLast(
                (bpmInfo) => state.currentSongTimeMs >= bpmInfo.time
            );
            if (currentTimingPoint) {
                currentBpm = currentTimingPoint.bpm;
                state.lastKnownBpm = currentBpm;
            }

            _renderLoopContent(state.currentSongTimeMs, currentBpm);

            while (
                state.upcomingNoteIndex < state.notes.length &&
                state.currentSongTimeMs > state.notes[state.upcomingNoteIndex].time + MISS_WINDOW_MS
            ) {
                const missedNote = state.notes[state.upcomingNoteIndex];
                if (!missedNote.isHit && !missedNote.isMissed) {
                    _processNoteMiss(missedNote);
                }
                state.upcomingNoteIndex++;
            }
        } else if (currentPhase === 'countdown' && !isPaused) {
            _renderLoopContent(0, state.lastKnownBpm);
        }
    }

    function _processNoteHit(key: string, laneIndex: number) {
        if (!state.pixiApp) return;
        const PERFECT_WINDOW_MS = Preferences.prefs.gameplay.perfectWindowMs ?? 50;
        const GOOD_WINDOW_MS = Preferences.prefs.gameplay.goodWindowMs ?? 100;
        const OK_WINDOW_MS = Preferences.prefs.gameplay.okWindowMs ?? 150;

        for (let i = state.notes.length - 1; i >= state.upcomingNoteIndex; i--) {
            const note = state.notes[i];
            if (note.lane !== laneIndex || note.isHit || note.isMissed) continue;

            const timeDifference = note.time - state.currentSongTimeMs;
            const absTimeDifference = Math.abs(timeDifference);

            if (absTimeDifference <= OK_WINDOW_MS) {
                let judgment = 'Ok';
                if (absTimeDifference <= PERFECT_WINDOW_MS) judgment = 'Perfect';
                else if (absTimeDifference <= GOOD_WINDOW_MS) judgment = 'Good';

                note.isHit = true;
                note.isMissed = false; // Explicitly set isMissed to false on a hit
                state.currentCombo++;
                state.currentScore += (judgment === 'Perfect' ? 300 : judgment === 'Good' ? 200 : 100);
                if (state.currentCombo > state.maxComboSoFar) {
                    state.maxComboSoFar = state.currentCombo;
                }
                state.callbacks.onScoreUpdate(state.currentScore, state.currentCombo, state.maxComboSoFar);
                state.callbacks.onNoteHit(note, judgment);
                _spawnVisualJudgment(note, judgment);
                if (state.receptorGraphics && state.receptorGraphics.receptors[laneIndex]) {
                    state.receptorGraphics.receptors[laneIndex].flash();
                }
                return;
            }
        }
    }

    function _processNoteMiss(note: Note) {
        state.currentCombo = 0;
        note.isMissed = true;
        note.isHit = false; // Explicitly set isHit to false on a miss
        state.callbacks.onScoreUpdate(state.currentScore, state.currentCombo, state.maxComboSoFar);
        state.callbacks.onNoteMiss(note);
        _spawnVisualJudgment(note, 'Miss');
    }

    // --- Public API / Instance Methods ---

    async function initialize(canvasElement: HTMLCanvasElement) {
        console.log('Initializing game instance...');
        await _setupPixiApp(canvasElement);
        processNotes();
        if (state.pixiApp) {
            state.pixiApp.ticker.add(updateGameLoop);
            state.pixiApp.ticker.stop();
        } else {
            console.error("PixiApp not initialized, cannot add ticker.");
        }
        console.log("Game instance initialized. Call beginGameplaySequence() to start.");
    }

    // This replaces the old 'startSong' and the implicit call to loadAudio in setup
    function beginGameplaySequence() {
        console.log('Beginning gameplay sequence...');
        if (state.phase === 'loading' || state.phase === 'summary' || state.phase === 'finished') {
            state.currentScore = 0;
            state.currentCombo = 0;
            state.maxComboSoFar = 0;
            state.currentSongTimeMs = 0;
            state.isPaused = false;
            state.judgmentTexts.forEach(jt => jt.destroy());
            state.judgmentTexts = [];
            processNotes();
            state.callbacks.onScoreUpdate(state.currentScore, state.currentCombo, state.maxComboSoFar);
            setPhase('loading');
            loadAudio();
        } else {
            console.warn(`Cannot begin gameplay sequence from phase: ${state.phase}`);
        }
    }

    return {
        initialize,
        beginGameplaySequence,
        pauseGame: () => {
            if ((state.phase === 'playing' || state.phase === 'countdown') && !state.isPaused) {
                state.isPaused = true;
                if (state.soundInstance) state.soundInstance.paused = true;
                state.pixiApp?.ticker.stop();
                console.log("Game paused");
            }
        },
        resumeGame: () => {
            if (state.isPaused && (state.phase === 'playing' || state.phase === 'countdown')) {
                state.isPaused = false;
                if (state.phase === 'playing' && state.sound && state.sound.isLoaded) {
                    if (state.soundInstance) state.soundInstance.paused = false;
                }
                state.pixiApp?.ticker.start();
                console.log("Game resumed");
            }
        },
        handleKeyPress: (key: string, event: KeyboardEvent) => {
            if (state.isPaused || state.phase !== 'playing') return;

            const lane = Preferences.prefs.gameplay.keybindings.findIndex(
                (k) => k === key.toLowerCase()
            );
            if (lane !== -1 && !state.keyStates[key.toLowerCase()]) {
                state.keyStates[key.toLowerCase()] = true;
                _processNoteHit(key.toLowerCase(), lane); // Internal game logic for hit
                if (state.receptorGraphics) state.receptorGraphics.receptors[lane]?.press();
            }
        },
        handleKeyRelease: (key: string, event: KeyboardEvent) => {
            if (state.phase === 'summary' || state.phase === 'finished') return;

            const lane = Preferences.prefs.gameplay.keybindings.findIndex(
                (k) => k === key.toLowerCase()
            );
            if (lane !== -1) {
                state.keyStates[key.toLowerCase()] = false;
                if (state.receptorGraphics) state.receptorGraphics.receptors[lane]?.release();
            }
        },
        handleResize: () => {
            if (!state.pixiApp || !state.canvasElementRef) return;

            const container = state.canvasElementRef.parentElement;
            let newWidth = 800; // Fallback
            let newHeight = 600; // Fallback
            if (container) {
                newWidth = container.clientWidth;
                newHeight = container.clientHeight;
            }

            // Get new sizing based on actual container dimensions
            const sizing = GameplaySizing.getGameplaySizing(newWidth, newHeight);

            state.pixiApp.renderer.resize(sizing.width, sizing.height);

            // Recalculate metrics based on the new size
            const highwayMetrics = GameplaySizing.getHighwayMetrics(state.chartData.numLanes, sizing.width, sizing.height);
            const receptorPositions = GameplaySizing.getReceptorPositions(highwayMetrics, sizing.width, sizing.height);
            const receptorSize = GameplaySizing.getReceptorSize(sizing.width, sizing.height);

            if (state.highwayGraphics) state.highwayGraphics.redraw(highwayMetrics);
            if (state.receptorGraphics) state.receptorGraphics.redraw(receptorPositions, receptorSize);
            if (state.keyPressEffectGraphics) state.keyPressEffectGraphics.redraw(receptorPositions, receptorSize);
            // Beatlines and notes will be redrawn on next _renderLoopContent call.
        },
        cleanup: () => {
            console.log('Cleaning up game instance...');
            if (state.countdownIntervalId) clearInterval(state.countdownIntervalId);
            if (state.finishAnimationTimerId) clearTimeout(state.finishAnimationTimerId);

            if (state.soundInstance) {
                state.soundInstance.destroy();
                state.soundInstance = null;
            }
            if (state.sound) {
                state.sound.destroy();
                state.sound = null;
            }

            state.judgmentTexts.forEach((jt) => jt.destroy());
            state.judgmentTexts = [];

            if (state.pixiApp) {
                state.pixiApp.ticker.stop();
                state.pixiApp.ticker.remove(updateGameLoop);
                state.pixiApp.ticker.destroy();
                state.mainContainer?.destroy({ children: true, texture: true }); // Removed baseTexture
                state.pixiApp.destroy(true, { children: true, texture: true }); // Removed baseTexture
                state.pixiApp = null;
            }
        },
        getCurrentPhase: () => state.phase,
        isPaused: () => state.isPaused,
    };
}

// Add `Application` to PIXI imports if not already there.
// Ensure GameplaySizing, Colors, and rendering functions are correctly imported and available.
// Note: Preferences import might be needed if used for keybindings etc.
// The GameCallbacks getGamePhase, getIsPaused, getCountdownValue will require +page.svelte to pass functions that read its stores.

// ... rest of the file remains unchanged ... 