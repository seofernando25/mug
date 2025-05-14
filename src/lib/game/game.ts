import { Application, Container } from 'pixi.js';
import type { Ticker } from 'pixi.js';
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
}

export interface GameInstance {
    // --- Control Functions ---
    // startSong: () => void; // This will be part of initial setup or a resetGame method
    initialize: (canvasElement: HTMLCanvasElement, initialAudioElement: HTMLAudioElement) => Promise<void>;
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
    audioElement: HTMLAudioElement | null;
    audioContext: AudioContext | null;
    audioSrcNode: MediaElementAudioSourceNode | null;
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
        audioElement: null, // Initialized in `initialize`
        audioContext: null,
        audioSrcNode: null,
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
        const sizing = GameplaySizing.getGameplaySizing();
        await pixiAppInstance.init({
            canvas: element,
            width: sizing.width,
            height: sizing.height,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            backgroundColor: 0x000000,
            backgroundAlpha: 0.5
        });

        state.pixiApp = pixiAppInstance;
        state.mainContainer = new Container();
        state.pixiApp.stage.addChild(state.mainContainer);

        const highwayMetrics = GameplaySizing.getHighwayMetrics(state.chartData.numLanes);
        const receptorPositions = GameplaySizing.getReceptorPositions(highwayMetrics);
        const receptorSize = GameplaySizing.getReceptorSize();

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

        const highwayMetrics = GameplaySizing.getHighwayMetrics(state.chartData.numLanes);
        const noteSize = GameplaySizing.getNoteSize();

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
        if (!state.audioElement) {
            // This should have been set by `initialize` method
            console.error("Audio element not provided for loadAudio");
            setPhase('loading'); // Stay in loading or move to an error phase
            return;
        }
        state.audioElement.src = state.songData.audioUrl;
        state.audioElement.preload = 'auto';

        state.audioElement.oncanplaythrough = () => {
            console.log('Audio can play through');
            if (state.phase === 'loading') {
                if (!state.audioContext && state.audioElement) {
                    try {
                        state.audioContext = new AudioContext();
                        state.audioSrcNode = state.audioContext.createMediaElementSource(state.audioElement);
                        state.audioSrcNode.connect(state.audioContext.destination);
                    } catch (e) {
                        console.error("Error setting up AudioContext:", e);
                        // Fallback or error handling if AudioContext fails (e.g. autoplay restrictions)
                    }
                }
                setPhase('countdown');
                startCountdown();
            }
        };

        state.audioElement.onended = () => {
            console.log('Audio ended');
            setPhase('finished');
            // Trigger finish sequence
            state.callbacks.onSongEnd(); // Notify Svelte component
            // After a delay, transition to summary
            if (state.finishAnimationTimerId) clearTimeout(state.finishAnimationTimerId);
            state.finishAnimationTimerId = setTimeout(() => {
                setPhase('summary');
            }, 2000); // 2s for "FINISH" animation
        };

        state.audioElement.onerror = (e) => {
            console.error('Audio error:', e);
            // Handle audio errors, perhaps set a specific error phase or notify UI
        };

        console.log('Loading audio src:', state.audioElement.src);
        state.audioElement.load(); // Start loading the audio
    }

    function startCountdown() {
        setPhase('countdown');
        state.countdownValue = 3; // Or a configurable value
        state.callbacks.onCountdownUpdate(state.countdownValue);

        if (state.countdownIntervalId) clearInterval(state.countdownIntervalId);
        state.countdownIntervalId = setInterval(() => {
            state.countdownValue--;
            state.callbacks.onCountdownUpdate(state.countdownValue);
            if (state.countdownValue <= 0) {
                clearInterval(state.countdownIntervalId);
                state.countdownIntervalId = null;
                if (state.audioElement && state.phase === 'countdown') {
                    state.audioElement.play().catch(e => console.error("Error playing audio:", e));
                    state.gameTimeStartMs = performance.now();
                    state.currentSongTimeMs = 0;
                    setPhase('playing');
                }
            }
        }, 1000);
    }

    function processNotes() {
        // Basic processing: assume notes are sorted by time
        // Add more complex parsing if needed (e.g. from .sm or .ssc files)
        state.notes = chartData.notes.map((note: any) => ({ ...note })).sort((a: any, b: any) => a.time - b.time);
        state.upcomingNoteIndex = 0;
    }

    function updateGameLoop(ticker: Ticker) {
        if (state.phase !== 'playing' || state.isPaused || !state.audioElement) {
            return;
        }

        state.currentSongTimeMs = state.audioElement.currentTime * 1000;

        // Missed notes detection
        while (state.upcomingNoteIndex < state.notes.length &&
            state.notes[state.upcomingNoteIndex].time < state.currentSongTimeMs - 200 /* MISS_WINDOW_AFTER */) {
            const missedNote = state.notes[state.upcomingNoteIndex];
            // Call the game logic handler for a miss
            _processNoteMiss(missedNote);
            state.upcomingNoteIndex++;
        }

        if (state.audioElement.currentTime >= state.audioElement.duration && state.phase === 'playing') {
            // console.log('Song ended (detected in game loop)');
        }
    }

    function _processNoteHit(key: string, laneIndex: number) {
        if (!state.pixiApp) return;

        const PERFECT_WINDOW = 50; // ms
        const GOOD_WINDOW = 100; // ms
        const OK_WINDOW = 150; // ms

        // Iterate backwards through notes near the current time for the pressed lane to find a suitable candidate
        // This is a more robust way than just looking at upcomingNoteIndex, especially for chords or slight misorderings.
        for (let i = state.notes.length - 1; i >= state.upcomingNoteIndex; i--) {
            const note = state.notes[i];
            if (note.lane !== laneIndex || (note as any).isHit) continue; // Skip if wrong lane or already hit

            const timeDifference = note.time - state.currentSongTimeMs;
            const absTimeDifference = Math.abs(timeDifference);

            if (absTimeDifference <= OK_WINDOW) { // Potential hit
                let judgment = 'Ok';
                if (absTimeDifference <= PERFECT_WINDOW) judgment = 'Perfect';
                else if (absTimeDifference <= GOOD_WINDOW) judgment = 'Good';

                (note as any).isHit = true; // Mark as hit to prevent re-processing
                state.currentCombo++;
                state.currentScore += (judgment === 'Perfect' ? 300 : judgment === 'Good' ? 200 : 100);
                if (state.currentCombo > state.maxComboSoFar) {
                    state.maxComboSoFar = state.currentCombo;
                }
                state.callbacks.onScoreUpdate(state.currentScore, state.currentCombo, state.maxComboSoFar);
                state.callbacks.onNoteHit(note, judgment); // Callback for +page.svelte (e.g., for visual judgment)
                _spawnVisualJudgment(note, judgment); // Spawn visual judgment directly
                if (state.receptorGraphics && state.receptorGraphics.receptors[laneIndex]) {
                    state.receptorGraphics.receptors[laneIndex].flash();
                }

                // Optional: if we only want to hit the *closest* note in the window for a given key press
                // we would `return` here. For now, let's assume a key press can only trigger one note.
                return;
            }
            // If a note for this lane is significantly in the future, no need to check earlier notes for this key press.
            if (timeDifference > OK_WINDOW) {
                // continue; // Or break if notes are strictly sorted and we are sure no earlier note for this lane could be hit.
            }
            // If a note is too far in the past (absTimeDifference > OK_WINDOW and timeDifference < 0), it's a miss.
            // This miss would typically be caught by updateGameLoop, but this check ensures we don't hit very late notes.
        }
        // If no note was hit, it might be an "empty" key press (no note in judgment window for that lane)
    }

    function _processNoteMiss(note: Note) {
        // console.log("Note missed:", note);
        state.currentCombo = 0; // Reset combo
        state.callbacks.onScoreUpdate(state.currentScore, state.currentCombo, state.maxComboSoFar);
        state.callbacks.onNoteMiss(note); // Callback for +page.svelte (e.g., for visual judgment)
        _spawnVisualJudgment(note, 'Miss'); // Spawn visual judgment directly
        (note as any).isHit = true; // Mark as missed (or hit with miss status) to prevent re-processing

    }

    // --- Public API / Instance Methods ---

    async function initialize(canvasElement: HTMLCanvasElement, initialAudioElement: HTMLAudioElement) {
        console.log('Initializing game instance...');
        state.audioElement = initialAudioElement;
        await _setupPixiApp(canvasElement);

        processNotes();
        if (state.pixiApp) {
            state.pixiApp.ticker.add(() => {
                // const currentPhase = state.callbacks.getGamePhase(); // Direct state access is fine here
                // const isPaused = state.callbacks.getIsPaused();

                if (state.isPaused) return;

                if (state.phase === 'playing' || state.phase === 'countdown') {
                    let currentTimeMs = 0;
                    if (state.audioElement && state.audioElement.readyState >= 2 && !state.audioElement.paused) {
                        currentTimeMs = state.audioElement.currentTime * 1000;
                    } else if (state.phase === 'countdown') {
                        const cdValue = state.callbacks.getCountdownValue(); // Get from Svelte store
                        currentTimeMs = -(cdValue > 0 ? cdValue : 0) * 1000;
                    }

                    const currentTimingPoint = state.chartData.timing.bpms.findLast(
                        (b: { time: number; bpm: number }) => b.time <= currentTimeMs / 1000
                    );
                    if (currentTimingPoint) state.lastKnownBpm = currentTimingPoint.bpm;

                    _renderLoopContent(currentTimeMs, state.lastKnownBpm);
                }
            });
            state.pixiApp.ticker.stop(); // Start it via phase changes
        } else {
            console.error("PixiApp not initialized, cannot add ticker.");
        }
        // loadAudio(); // loadAudio will be called by beginGameplaySequence
        console.log("Game instance initialized. Call beginGameplaySequence() to start.");
    }

    // This replaces the old 'startSong' and the implicit call to loadAudio in setup
    function beginGameplaySequence() {
        console.log('Beginning gameplay sequence...');
        if (state.phase === 'loading' || state.phase === 'summary' || state.phase === 'finished') {
            // Reset relevant state for a new game
            state.currentScore = 0;
            state.currentCombo = 0;
            state.maxComboSoFar = 0;
            state.currentSongTimeMs = 0;
            state.upcomingNoteIndex = 0;
            state.isPaused = false;
            state.judgmentTexts = []; // Clear previous judgments
            state.noteGraphics = []; // Clear previous note graphics
            // state.keyStates = {}; // Reset key states if necessary, or rely on keyup

            // Reset UI stores through callbacks
            state.callbacks.onScoreUpdate(state.currentScore, state.currentCombo, state.maxComboSoFar);
            // isPaused will be false, onPhaseChange to 'loading' will trigger UI updates

            setPhase('loading'); // Transition to loading to trigger audio load
            loadAudio();
        } else {
            console.warn(`Cannot begin gameplay sequence from phase: ${state.phase}`);
        }
    }

    return {
        initialize,
        beginGameplaySequence,
        pauseGame: () => {
            if (state.phase === 'playing' || state.phase === 'countdown') {
                state.isPaused = true;
                state.audioElement?.pause();
                state.pixiApp?.ticker.stop();
                // Notify Svelte UI to show pause screen (via isPausedStore in +page.svelte)
                // This can be done by +page.svelte reacting to a callback or checking isPaused()
                // For simplicity, we assume +page.svelte's isPausedStore is updated by its own logic based on game phase and this call.
                // Or, add a specific callback if direct control from game.ts is preferred.
                // state.callbacks.onPauseStateChange?.(true);
                console.log("Game paused");
            }
        },
        resumeGame: () => {
            if (state.isPaused && (state.phase === 'playing' || state.phase === 'countdown')) {
                state.isPaused = false;
                // Only play audio if we are in the 'playing' phase, not 'countdown' (countdown handles its own audio start)
                if (state.phase === 'playing') {
                    state.audioElement?.play().catch(e => console.error("Error resuming audio:", e));
                }
                state.pixiApp?.ticker.start();
                // state.callbacks.onPauseStateChange?.(false);
                console.log("Game resumed");
            }
        },
        handleKeyPress: (key: string, event: KeyboardEvent) => {
            // const currentPhase = state.callbacks.getGamePhase(); // Direct access fine
            // const isPaused = state.callbacks.getIsPaused();

            // Pause/Resume with Escape is handled in +page.svelte for now as it directly manipulates UI stores
            // and gameInstance.pause/resume. If we move that here, we need more callbacks for UI state.

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
            // const currentPhase = state.callbacks.getGamePhase(); // Direct access fine
            // if (currentPhase === 'summary' || currentPhase === 'finished') return;
            if (state.phase === 'summary' || state.phase === 'finished') return;

            const lane = Preferences.prefs.gameplay.keybindings.findIndex(
                (k) => k === key.toLowerCase()
            );
            if (lane !== -1) {
                state.keyStates[key.toLowerCase()] = false;
                // _processNoteRelease(key.toLowerCase(), lane); // For hold notes, if any
                if (state.receptorGraphics) state.receptorGraphics.receptors[lane]?.release();
            }
        },
        handleResize: () => {
            if (!state.pixiApp || !state.canvasElementRef) return;
            const sizing = GameplaySizing.getGameplaySizing(); // Use the canvas from state.canvasElementRef for sizing
            state.pixiApp.renderer.resize(sizing.width, sizing.height);

            const highwayMetrics = GameplaySizing.getHighwayMetrics(state.chartData.numLanes);
            const receptorPositions = GameplaySizing.getReceptorPositions(highwayMetrics);
            const receptorSize = GameplaySizing.getReceptorSize();

            if (state.highwayGraphics) state.highwayGraphics.redraw(highwayMetrics);
            if (state.receptorGraphics) state.receptorGraphics.redraw(receptorPositions, receptorSize);
            if (state.keyPressEffectGraphics) state.keyPressEffectGraphics.redraw(receptorPositions, receptorSize);
            // Beatlines and notes will be redrawn on next _renderLoopContent call.
        },
        cleanup: () => {
            console.log('Cleaning up game instance...');
            if (state.countdownIntervalId) clearInterval(state.countdownIntervalId);
            if (state.finishAnimationTimerId) clearTimeout(state.finishAnimationTimerId);
            state.audioElement?.pause();
            if (state.audioElement) {
                state.audioElement.src = '';
                state.audioElement.load(); // Release resources
                // Detach event listeners from audio element if they were added by game.ts
                state.audioElement.oncanplaythrough = null;
                state.audioElement.onended = null;
                state.audioElement.onerror = null;
            }
            state.audioContext?.close();

            state.judgmentTexts.forEach((jt) => jt.destroy());
            state.judgmentTexts = [];
            state.noteGraphics.forEach((ng) => {
                ng.headGraphics.destroy();
                ng.bodyGraphics?.destroy();
            });
            state.noteGraphics = [];

            if (state.pixiApp) {
                state.pixiApp.ticker.stop();
                state.pixiApp.ticker.destroy(); // Destroy ticker explicitly
                state.mainContainer?.destroy({ children: true, texture: true });
                state.pixiApp.destroy(true, { children: true, texture: true });
                state.pixiApp = null;
            }
            // state.canvasElementRef = null; // No need to nullify, it's owned by Svelte component
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