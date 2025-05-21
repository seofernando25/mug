import { Preferences } from '$lib/preferences';
import {
    drawHighway,
    drawJudgmentText,
    drawKeyPressEffects,
    drawReceptor,
    getHighwayMetrics,
    getReceptorPositions,
    getReceptorSize,
    updateKeyPressVisuals,
    updateNotes,
    type NoteGraphicsEntry
} from '$lib/rendering';
import { masterVolume, musicVolume } from '$lib/stores/settingsStore';
import type {
    ChartHitObject,
    ClientChart, ClientSong
} from '$lib/types';
import { Sound, type IMediaInstance } from '@pixi/sound';
import type { Ticker } from 'pixi.js';
import { Application, Container } from 'pixi.js';
import { derived, get, writable } from 'svelte/store';
import { Colors } from './index';


type GameplayNote = ChartHitObject & {
    id: string | number; // Unique identifier for the note (could be original index)
    isHit: boolean;
    isMissed: boolean;
};


export type GamePhase = 'loading' | 'countdown' | 'playing' | 'finished' | 'summary';

export async function createGame(
    songData: ClientSong,
    chartData: ClientChart,
    canvasElement: HTMLCanvasElement,
    callbacks: {
        onPhaseChange: (phase: GamePhase) => void;
        onCountdownUpdate: (value: number) => void;
        onSongEnd: () => void;
        onScoreUpdate: (score: number, combo: number, maxCombo: number) => void;
        onNoteHit: (note: GameplayNote, judgment: string, color?: number) => void;
        onNoteMiss: (note: GameplayNote) => void;
        getGamePhase: () => GamePhase;
        getIsPaused: () => boolean;
        getCountdownValue: () => number;
        onTimeUpdate?: (currentTimeMs: number) => void; // Added for live time updates
    }
) {
    let phase: GamePhase = 'loading';
    let isPaused: boolean = false;
    let sound: Sound = Sound.from({
        url: songData.audioUrl,
        preload: true,
        loaded: (err: Error | null, loadedSound?: Sound) => {
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
            sound = loadedSound;
            // Set initial volume based on store values
            sound.volume = get(masterVolume) * get(musicVolume);
            console.log('@pixi/sound: Audio loaded. Duration:', sound.duration, 's');
            if (phase === 'loading') {
                setPhase('countdown');
                startCountdown();
            }
        }
    });
    let soundInstance: IMediaInstance | null = null;
    let currentSongTimeMs = 0;
    let gameTimeStartMs = 0;
    let countdownValue = 3;
    let currentScore = 0;
    let currentCombo = 0;
    let maxCombo = 0;
    let notes: GameplayNote[] = [];
    let upcomingNoteIndex = 0;
    let countdownIntervalId: ReturnType<typeof setInterval> | null = null;
    let finishAnimationTimerId: ReturnType<typeof setTimeout> | null = null;
    let pixiApp = new Application();
    let mainContainer = new Container();
    let noteGraphics = new Map<number, NoteGraphicsEntry>();
    let judgmentTextsByLane: Record<number, ReturnType<typeof drawJudgmentText> | null> = {};
    let keyStates: Record<string, boolean> = {};
    let currentSpeedMultiplier = 1.0;

    let cleanupSubscriptions: (() => void) | null = null;

    await pixiApp.init({
        canvas: canvasElement,
        width: canvasElement.clientWidth,
        height: canvasElement.clientHeight,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundColor: 0x000000,
    });


    console.log('Initializing game instance...');
    processNotes();
    if (pixiApp) {
        pixiApp.ticker.add(updateGameLoop);
        pixiApp.ticker.stop();
    } else {
        console.error("PixiApp not initialized, cannot add ticker.");
    }
    console.log("Game instance initialized. Call beginGameplaySequence() to start.");


    const appWidth = writable(pixiApp.screen.width);
    const appHeight = writable(pixiApp.screen.height);


    const highwayMetrics = derived(
        [appHeight, appWidth],
        ([height, width]) => getHighwayMetrics(chartData.lanes, width, height)
    );
    const receptorPositions = getReceptorPositions(highwayMetrics)

    const receptorSize = derived([appHeight, appWidth], ([height, width]) => getReceptorSize(width, height));

    pixiApp.stage.addChild(mainContainer);

    const highwayGraphics = drawHighway(pixiApp, mainContainer, highwayMetrics)
    const receptorGraphics = drawReceptor(mainContainer, receptorPositions, receptorSize);


    const keyPressEffectGraphics = drawKeyPressEffects(
        mainContainer,
        chartData.lanes,
    );


    console.log('chartData', chartData);
    if (typeof chartData.noteScrollSpeed === 'number' && chartData.noteScrollSpeed > 0) {
        currentSpeedMultiplier = chartData.noteScrollSpeed;
        console.log(`Chart noteScrollSpeed set to: ${currentSpeedMultiplier}`);
    } else {
        currentSpeedMultiplier = 1.0;
        console.log('Chart noteScrollSpeed not found or invalid, defaulting to 1.0');
    }

    const setPhase = (newPhase: typeof phase) => {
        phase = newPhase;
        callbacks.onPhaseChange(newPhase);
        console.log(`Game phase changed to: ${newPhase}`);

        if (newPhase === 'playing' || newPhase === 'countdown') {
            if (!isPaused) pixiApp.ticker.start();
        } else {
            pixiApp.ticker.stop();
        }
    }


    function _renderLoopContent(currentTimeMs: number) {
        if (!pixiApp || !mainContainer || !highwayGraphics) return;
        const currentPhase = callbacks.getGamePhase();
        const isPaused = callbacks.getIsPaused();

        if (isPaused && currentPhase !== 'playing' && currentPhase !== 'countdown') return;

        const container = pixiApp.canvas.parentElement
        let currentWidth = pixiApp.screen.width;
        let currentHeight = pixiApp.screen.height;
        if (container) {
            currentWidth = container.clientWidth;
            currentHeight = container.clientHeight;
        }

        const highwayMetrics = getHighwayMetrics(chartData.lanes, currentWidth, currentHeight);


        // Prepare arguments for updateNotes
        const activeNotesForUpdate: Array<ChartHitObject> = [];
        const judgedNoteIds = new Set<number>();

        notes.forEach(note => {
            // Assuming note.id is consistently a number. If it can be a string, conversion or different handling is needed.
            // ClientHitObject is Pick<ChartHitObject, 'time' | 'lane' | 'type' | 'duration'>
            // GameplayNote = ClientHitObject & { id: string | number; isHit: boolean; isMissed: boolean; };
            // ChartHitObject has id: number. So GameplayNote.id should ideally come from there or be a number.

            const noteId = typeof note.id === 'string' ? parseInt(note.id, 10) : note.id; // Attempt to ensure numeric ID

            if (isNaN(noteId)) {
                console.warn("Skipping note with non-numeric ID:", note);
                return;
            }

            if (note.isHit || note.isMissed) {
                judgedNoteIds.add(noteId);
            }
            // updateNotes itself filters by visibility, so we pass all non-judged notes.
            // However, updateNotes expects ClientHitObject & { id: number }.
            // GameplayNote already extends ClientHitObject.
            activeNotesForUpdate.push({
                id: noteId,
                chartId: chartData.id,
                time: note.time,
                lane: note.lane,
                note_type: note.note_type,
                duration: note.duration
            });
        });

        // The updateNotes function from notes.ts expects sortedHitObjects.
        // The current notes might not be sorted by time if notes are processed out of order or ids are not sequential with time.
        // For now, proceeding without explicit re-sorting here, assuming notes is appropriately ordered or updateNotes handles it.
        // If not, notes should be sorted by time before this step.
        const sortedActiveNotes = activeNotesForUpdate.sort((a, b) => a.time - b.time);



        noteGraphics = updateNotes(
            currentTimeMs,
            mainContainer!,
            highwayMetrics.x,
            highwayMetrics.laneWidth,
            highwayMetrics.receptorYPosition,
            currentSpeedMultiplier,
            pixiApp.screen.height,
            sortedActiveNotes,
            noteGraphics,
            judgedNoteIds
        );

        if (keyPressEffectGraphics && highwayMetrics) {
            const lanePressedStates = Preferences.prefs.gameplay.keybindings.map(
                (key) => !!keyStates[key.toLowerCase()]
            );
            updateKeyPressVisuals(
                keyPressEffectGraphics.visuals,
                keyPressEffectGraphics.laneData,
                lanePressedStates,
                chartData.lanes,
                highwayMetrics.laneWidth,
                highwayMetrics.x,
                highwayMetrics.receptorYPosition,
                pixiApp.ticker.deltaMS / 1000,
                Colors.HIT_ZONE_CENTER
            );
        }

        // Update and filter judgment texts per lane
        for (const laneIndexStr in judgmentTextsByLane) {
            const laneIndex = parseInt(laneIndexStr, 10); // Ensure laneIndex is a number
            const judgmentText = judgmentTextsByLane[laneIndex];
            if (judgmentText) {
                judgmentText.updateAnimation(pixiApp!.ticker.deltaMS);
                if (judgmentText.alpha <= 0) {
                    judgmentText.destroy(); // Destroy the PIXI object
                    judgmentTextsByLane[laneIndex] = null; // Remove from active judgments
                }
            }
        }
    }

    function _spawnVisualJudgment(note: GameplayNote, judgment: string) {
        if (!pixiApp || !mainContainer) return;

        const laneIndex = note.lane;

        // If there's an existing judgment for this lane, destroy it first
        const existingJudgment = judgmentTextsByLane[laneIndex];
        if (existingJudgment) {
            existingJudgment.destroy();
        }

        // Get current canvas dimensions for accurate positioning
        const canvasWidth = pixiApp.screen.width;
        const canvasHeight = pixiApp.screen.height;
        const currentHighwayMetrics = getHighwayMetrics(
            chartData.lanes,
            canvasWidth,
            canvasHeight
        );

        const newJudgment = drawJudgmentText(
            pixiApp,
            mainContainer,
            judgment,
            laneIndex,
            currentHighwayMetrics.x,
            currentHighwayMetrics.laneWidth,
            currentHighwayMetrics.judgmentLineYPosition
        );
        judgmentTextsByLane[laneIndex] = newJudgment; // Store new judgment by lane
    }

    function loadAudio() {
        soundInstance?.destroy();


        console.log('Loading audio with @pixi/sound:', songData.audioUrl);
        try {

            // Subscribe to volume changes
            const unsubscribeMaster = masterVolume.subscribe(value => {
                if (sound) {
                    sound.volume = value * get(musicVolume);
                }
            });

            const unsubscribeMusic = musicVolume.subscribe(value => {
                if (sound) {
                    sound.volume = get(masterVolume) * value;
                }
            });

            // Clean up subscriptions when the game is cleaned up
            cleanupSubscriptions = () => {
                unsubscribeMaster();
                unsubscribeMusic();
            };
        } catch (e) {
            console.error("Error initiating @pixi/sound Sound.from:", e);
            setPhase('loading');
        }
    }

    function startCountdown() {
        setPhase('countdown');
        countdownValue = 3;
        callbacks.onCountdownUpdate(countdownValue);

        if (countdownIntervalId) clearInterval(countdownIntervalId);
        countdownIntervalId = setInterval(() => {
            countdownValue--;
            callbacks.onCountdownUpdate(countdownValue);
            if (countdownValue <= 0) {
                clearInterval(countdownIntervalId as ReturnType<typeof setInterval>);
                countdownIntervalId = null;
                if (sound && sound.isLoaded && phase === 'countdown') {
                    try {
                        // play() might return an instance or a Promise for an instance
                        const instanceOrPromise = sound.play();
                        Promise.resolve(instanceOrPromise).then((instance: IMediaInstance) => { // Use imported IMediaInstance
                            if (!instance) {
                                console.error("@pixi/sound.play did not yield a valid instance.");
                                setPhase('loading');
                                return;
                            }
                            soundInstance = instance;
                            soundInstance.on('end', () => {
                                console.log('@pixi/sound: Audio instance ended');
                                if (phase === 'playing') {
                                    setPhase('finished');
                                    callbacks.onSongEnd();
                                    if (finishAnimationTimerId) clearTimeout(finishAnimationTimerId);
                                    finishAnimationTimerId = setTimeout(() => {
                                        setPhase('summary');
                                    }, 2000);
                                }
                            });
                            // soundInstance.on('progress', (progress: number) => {});

                            gameTimeStartMs = performance.now();
                            currentSongTimeMs = 0;
                            setPhase('playing');

                        }).catch(err => {
                            console.error("Error resolving sound instance from play():", err);
                            setPhase('loading');
                        });
                    } catch (e) {
                        console.error("Error playing sound with @pixi/sound:", e);
                        setPhase('loading');
                    }
                } else if (phase === 'countdown') {
                    console.warn('In countdown, but sound not ready or not in correct phase to play.');
                }
            }
        }, 1000);
    }

    function processNotes() {
        // Ensure notes are sorted by time for correct processing order
        notes = [...chartData.hitObjects] // Changed from .notes
            .sort((a, b) => a.time - b.time)
            .map((note, index) => ({
                ...note,
                isHit: false,
                isMissed: false,
            }));
        upcomingNoteIndex = 0;
        console.log(`Processed ${notes.length} notes.`);
    }

    const MISS_WINDOW_MS = 150; // Default miss window after note time (aligned with Meh window)

    function updateGameLoop(ticker: Ticker) {
        if (!pixiApp || phase === 'loading') return;

        const currentTimeSystem = performance.now();
        if (!isPaused) {
            currentSongTimeMs = currentTimeSystem - gameTimeStartMs;
        }

        if (callbacks.onTimeUpdate) {
            callbacks.onTimeUpdate(currentSongTimeMs);
        }



        _renderLoopContent(currentSongTimeMs);

        while (
            upcomingNoteIndex < notes.length &&
            currentSongTimeMs > notes[upcomingNoteIndex].time + MISS_WINDOW_MS
        ) {
            const missedNote = notes[upcomingNoteIndex];
            if (!missedNote.isHit && !missedNote.isMissed) {
                _processNoteMiss(missedNote);
            }
            upcomingNoteIndex++;
        }
    }

    function _processNoteHit(key: string, laneIndex: number) {
        if (!pixiApp) return;
        const PERFECT_WINDOW_MS = Preferences.prefs.gameplay.perfectWindowMs ?? 30;
        const EXCELLENT_WINDOW_MS = Preferences.prefs.gameplay.excellentWindowMs ?? 60;
        const GOOD_WINDOW_MS = Preferences.prefs.gameplay.goodWindowMs ?? 90;
        const MEH_WINDOW_MS = Preferences.prefs.gameplay.mehWindowMs ?? 150; // Changed from okWindowMs

        for (let i = notes.length - 1; i >= upcomingNoteIndex; i--) {
            const note = notes[i];
            if (note.lane !== laneIndex || note.isHit || note.isMissed) continue;

            const timeDifference = note.time - currentSongTimeMs; // Negative if late, positive if early
            const absTimeDifference = Math.abs(timeDifference);

            if (absTimeDifference <= MEH_WINDOW_MS) { // Check if within the widest judgment window (Meh)
                let judgment = '';
                let score = 0;

                if (absTimeDifference <= PERFECT_WINDOW_MS) {
                    judgment = 'Perfect';
                    score = 300;
                } else if (absTimeDifference <= EXCELLENT_WINDOW_MS) {
                    judgment = timeDifference < 0 ? 'Late Excellent' : 'Early Excellent';
                    score = 200; // Score for Excellent
                } else if (absTimeDifference <= GOOD_WINDOW_MS) {
                    judgment = timeDifference < 0 ? 'Late Good' : 'Early Good';
                    score = 100;
                } else { // Implies absTimeDifference <= MEH_WINDOW_MS
                    judgment = timeDifference < 0 ? 'Late Meh' : 'Early Meh';
                    score = 50;
                }

                note.isHit = true;
                note.isMissed = false; // Explicitly set isMissed to false on a hit
                currentCombo++;
                currentScore += score;
                if (currentCombo > maxCombo) {
                    maxCombo = currentCombo;
                }
                callbacks.onScoreUpdate(currentScore, currentCombo, maxCombo);
                callbacks.onNoteHit(note, judgment, Colors.LANE_COLORS[laneIndex]);
                _spawnVisualJudgment(note, judgment);
                if (receptorGraphics && receptorGraphics.receptors[laneIndex]) {
                    receptorGraphics.receptors[laneIndex].flash();
                }
                return; // Note processed
            }
        }
    }

    function _processNoteMiss(note: GameplayNote) {
        currentCombo = 0;
        note.isMissed = true;
        note.isHit = false; // Explicitly set isHit to false on a miss
        callbacks.onScoreUpdate(currentScore, currentCombo, maxCombo);
        callbacks.onNoteMiss(note);
        _spawnVisualJudgment(note, 'Miss');
    }

    // --- Public API / Instance Methods ---


    // This replaces the old 'startSong' and the implicit call to loadAudio in setup
    function beginGameplaySequence() {
        console.log('Beginning gameplay sequence...');
        if (phase === 'loading' || phase === 'summary' || phase === 'finished') {
            currentScore = 0;
            currentCombo = 0;
            maxCombo = 0;
            currentSongTimeMs = 0;
            isPaused = false;
            // Clear old judgment texts by lane
            Object.values(judgmentTextsByLane).forEach(jt => {
                if (jt) jt.destroy();
            });
            judgmentTextsByLane = {}; // Reset the record

            processNotes();
            callbacks.onScoreUpdate(currentScore, currentCombo, maxCombo);
            setPhase('loading');
            loadAudio();
        } else {
            console.warn(`Cannot begin gameplay sequence from phase: ${phase}`);
        }
    }

    return {
        beginGameplaySequence,
        pauseGame: () => {
            if ((phase === 'playing' || phase === 'countdown') && !isPaused) {
                isPaused = true;
                if (soundInstance) soundInstance.paused = true;
                pixiApp?.ticker.stop();
                console.log("Game paused");
            }
        },
        resumeGame: () => {
            if (isPaused && (phase === 'playing' || phase === 'countdown')) {
                isPaused = false;
                if (phase === 'playing' && sound && sound.isLoaded) {
                    if (soundInstance) soundInstance.paused = false;
                }
                pixiApp?.ticker.start();
                console.log("Game resumed");
            }
        },
        handleKeyPress: (key: string, event: KeyboardEvent) => {
            if (isPaused || phase !== 'playing') return;

            const lane = Preferences.prefs.gameplay.keybindings.findIndex(
                (k) => k === key.toLowerCase()
            );
            if (lane !== -1 && !keyStates[key.toLowerCase()]) {
                keyStates[key.toLowerCase()] = true;
                _processNoteHit(key.toLowerCase(), lane); // Internal game logic for hit
                if (receptorGraphics) receptorGraphics.receptors[lane]?.press();
            }
        },
        handleKeyRelease: (key: string, event: KeyboardEvent) => {
            if (phase === 'summary' || phase === 'finished') return;

            const lane = Preferences.prefs.gameplay.keybindings.findIndex(
                (k) => k === key.toLowerCase()
            );
            if (lane !== -1) {
                keyStates[key.toLowerCase()] = false;
                if (receptorGraphics) receptorGraphics.receptors[lane]?.release();
            }
        },
        handleResize: () => {
            const container = pixiApp.canvas.parentElement;
            let newWidth = 800; // Fallback
            let newHeight = 600; // Fallback
            if (container) {
                newWidth = container.clientWidth;
                newHeight = container.clientHeight;
            }
            console.log('Resizing to', newWidth, newHeight);

            // Get new sizing based on actual container dimensions
            pixiApp.renderer.resize(newWidth, newHeight);

            // Recalculate metrics based on the new size

            highwayGraphics.redraw();
            receptorGraphics.redraw();
            keyPressEffectGraphics.redraw();
            // Beatlines and notes will be redrawn on next _renderLoopContent call.
        },
        cleanup: () => {
            console.log('Cleaning up game instance...');
            if (countdownIntervalId) clearInterval(countdownIntervalId);
            if (finishAnimationTimerId) clearTimeout(finishAnimationTimerId);
            if (soundInstance) {
                soundInstance.destroy();
                soundInstance = null;
            }
            if (sound) {
                sound.destroy();
            }
            if (cleanupSubscriptions) {
                cleanupSubscriptions();
            }
            if (pixiApp) {
                pixiApp.ticker.stop();
                mainContainer?.destroy({ children: true, texture: true });
                pixiApp.destroy(true, { children: true, texture: true });
            }
        },
        getCurrentPhase: () => phase,
        isPaused: () => isPaused,
        getHighwayMetrics: () => {
            const container = pixiApp.canvas.parentElement;
            let width = pixiApp.screen.width;
            let height = pixiApp.screen.height;
            if (container) {
                width = container.clientWidth;
                height = container.clientHeight;
            }
            return getHighwayMetrics(chartData.lanes, width, height);
        }
    };
}
