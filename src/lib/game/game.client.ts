import { Preferences } from '$lib/preferences';
import {
    drawHighway,
    drawJudgmentText,
    drawKeyPressEffects,
    drawReceptor,
    getHighwayMetrics,
    getReceptorPositions,
    getReceptorSize,
    HoldNote,
    NotePool,
    redrawNoteGraphicsOnResize,
    updateKeyPressVisuals,
    updateNotes
} from '$lib/rendering';
import { masterVolume, musicVolume } from '$lib/stores/settingsStore';
import type {
    ChartHitObject,
    ClientChart, ClientSong
} from '$lib/types';
import { Colors } from '$lib/types';
import { Sound, type IMediaInstance } from '@pixi/sound';
import type { Ticker } from 'pixi.js';
import { Application, Container } from 'pixi.js';
import { derived, get, writable } from 'svelte/store';


type GameplayNote = ChartHitObject & {
    id: string | number; // Unique identifier for the note (could be original index)
    isHit: boolean; // True if the head of the note was hit
    isMissed: boolean; // True if the head of the note was missed
    isHolding?: boolean; // True if the player is currently holding the key for an active hold note
    holdSatisfied?: boolean; // True if the hold was successfully completed
    holdBroken?: boolean; // True if the hold was released too early
    // TODO: Potentially add visualState: 'idle' | 'active' | 'broken' | 'satisfied' for rendering
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
    let notePool: NotePool;
    let judgmentTextsByLane: Record<number, ReturnType<typeof drawJudgmentText> | null> = {};
    let keyStates: Record<string, boolean> = {};
    let currentSpeedMultiplier = 1.0;
    let pauseStartTimeMs = 0; // Added to track when pause began
    let authoritativeAudioTimeMs: number = -1; // Time reported by audio engine, in MS

    let cleanupSubscriptions: (() => void) | null = null;

    await pixiApp.init({
        canvas: canvasElement,
        width: canvasElement.clientWidth,
        height: canvasElement.clientHeight,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundColor: 0x000000,
        backgroundAlpha: 0.0,
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
    notePool = new NotePool(mainContainer, get(highwayMetrics).laneWidth);

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

    const setPhase = (newPhase: GamePhase) => {
        phase = newPhase;
        callbacks.onPhaseChange(newPhase);
        console.log(`Game phase changed to: ${newPhase}`);

        if (newPhase === 'playing' || newPhase === 'countdown') {
            if (!isPaused && pixiApp && pixiApp.ticker) pixiApp.ticker.start();
        } else {
            if (pixiApp && pixiApp.ticker) pixiApp.ticker.stop();
        }
    };

    const startCountdown = () => {
        setPhase('countdown');
        countdownValue = 3;
        callbacks.onCountdownUpdate(countdownValue);

        gameTimeStartMs = performance.now() + countdownValue * 1000;

        if (countdownIntervalId) clearInterval(countdownIntervalId);
        countdownIntervalId = setInterval(() => {
            countdownValue--;
            callbacks.onCountdownUpdate(countdownValue);
            if (countdownValue <= 0) {
                clearInterval(countdownIntervalId as ReturnType<typeof setInterval>);
                countdownIntervalId = null;
                if (sound && sound.isLoaded && phase === 'countdown') {
                    try {
                        const instanceOrPromise = sound.play();
                        Promise.resolve(instanceOrPromise).then((instance: IMediaInstance) => {
                            if (!instance) {
                                console.error("@pixi/sound.play did not yield a valid instance.");
                                setPhase('loading');
                                return;
                            }
                            soundInstance = instance;
                            authoritativeAudioTimeMs = 0; // Audio playback starts, set authoritative time to 0

                            soundInstance.on('progress', (progress: number, duration: number) => {
                                if (duration > 0) {
                                    authoritativeAudioTimeMs = progress * duration * 1000;
                                }
                            });

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
    };

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
        const activeNotesForUpdate: Array<ChartHitObject & { isActivelyHeld?: boolean }> = [];
        const judgedNoteIds = new Set<number>();

        notes.forEach(note => {
            const noteId = typeof note.id === 'string' ? parseInt(note.id, 10) : note.id;
            if (isNaN(noteId)) {
                console.warn("Skipping note with non-numeric ID:", note);
                return;
            }
            if (note.isHit || note.isMissed) {
                judgedNoteIds.add(noteId);
            }
            // Add isActivelyHeld for hold notes
            let isActivelyHeld: boolean | undefined = undefined;
            if (note.note_type === 'hold') {
                const keyForLane = Preferences.prefs.gameplay.keybindings[note.lane];
                const isKeyPressed = keyForLane ? !!keyStates[keyForLane.toLowerCase()] : false;
                isActivelyHeld = !!note.isHolding && isKeyPressed;
            }
            activeNotesForUpdate.push({
                id: noteId,
                chartId: chartData.id,
                time: note.time,
                lane: note.lane,
                note_type: note.note_type,
                duration: note.duration,
                ...(isActivelyHeld !== undefined ? { isActivelyHeld } : {})
            });
        });

        // The updateNotes function from notes.ts expects sortedHitObjects.
        // The current notes might not be sorted by time if notes are processed out of order or ids are not sequential with time.
        // For now, proceeding without explicit re-sorting here, assuming notes is appropriately ordered or updateNotes handles it.
        // If not, notes should be sorted by time before this step.
        const sortedActiveNotes = activeNotesForUpdate.sort((a, b) => a.time - b.time);



        updateNotes(
            currentTimeMs,
            notePool,
            highwayMetrics.x,
            highwayMetrics.laneWidth,
            highwayMetrics.receptorYPosition,
            highwayMetrics.receptorYPosition,
            currentSpeedMultiplier,
            pixiApp.screen.height,
            sortedActiveNotes,
            judgedNoteIds
        );

        // After notes are updated by rendering, apply state-specific visuals for holds
        for (const gameNote of notePool.getActiveNotes()) {
            const gameplayNote = notes.find(n => n.id === gameNote.id);
            if (gameplayNote && gameplayNote.note_type === 'hold') {
                const keyForLane = Preferences.prefs.gameplay.keybindings[gameplayNote.lane];
                const isKeyPressed = keyForLane ? !!keyStates[keyForLane.toLowerCase()] : false;

                if (gameplayNote.holdBroken) {
                    const brokenColor = Colors.LANE_BACKGROUNDS[gameplayNote.lane % Colors.LANE_BACKGROUNDS.length];
                    gameNote.headGraphics.tint = brokenColor;
                    if (gameNote instanceof HoldNote && gameNote.bodyGraphics) {
                        gameNote.bodyGraphics.tint = brokenColor;
                    }
                    if (gameNote instanceof HoldNote && gameNote.tailGraphics) {
                        gameNote.tailGraphics.tint = brokenColor;
                    }
                } else if (gameplayNote.isHolding && isKeyPressed) {
                    const activeColor = Colors.LANE_COLORS[gameplayNote.lane % Colors.LANE_COLORS.length];
                    gameNote.headGraphics.tint = activeColor;
                    if (gameNote instanceof HoldNote && gameNote.bodyGraphics) {
                        gameNote.bodyGraphics.tint = activeColor;
                    }
                    // Active hold tail could also use activeColor or a distinct variant if desired
                    // For now, it will reset to default (lane color) if not actively held or broken.
                } else {
                    // Reset to default lane color (which is now set in GameNote/HoldNote create/reset)
                    // No explicit tinting needed here if default is desired, 
                    // but good to ensure it reverts from active/broken states.
                    const defaultLaneColor = Colors.LANE_COLORS[gameplayNote.lane % Colors.LANE_COLORS.length];
                    gameNote.headGraphics.tint = defaultLaneColor;
                    if (gameNote instanceof HoldNote && gameNote.bodyGraphics) {
                        gameNote.bodyGraphics.tint = defaultLaneColor;
                    }
                    if (gameNote instanceof HoldNote && gameNote.tailGraphics) {
                        gameNote.tailGraphics.tint = defaultLaneColor;
                    }
                }
            } else if (gameplayNote) {
                // For tap notes, or holds that are not in a special state (active/broken), rely on their base color.
                // Base color is already set by _createOrUpdateHeadGraphics to the correct lane color.
                // If a different tint is ever applied to tap notes, this is where it would be reset.
                gameNote.headGraphics.tint = Colors.LANE_COLORS[gameplayNote.lane % Colors.LANE_COLORS.length];
            }
        }

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

    function processNotes() {
        // Ensure notes are sorted by time for correct processing order
        notes = [...chartData.hitObjects] // Changed from .notes
            .sort((a, b) => a.time - b.time)
            .map((note, index) => ({
                ...note,
                id: note.id, // Ensure 'id' is explicitly carried over or regenerated if needed
                isHit: false,
                isMissed: false,
                isHolding: false,
                holdSatisfied: false,
                holdBroken: false,
            }));
        upcomingNoteIndex = 0;
        console.log(`Processed ${notes.length} notes.`);
    }

    const MISS_WINDOW_MS = 150; // Default miss window after note time (aligned with Meh window)
    const HOLD_PERFECT_SCORE = 150; // Score for completing a hold note perfectly.
    const HOLD_GOOD_SCORE = 100; // Score for a good hold release.
    const HOLD_EXCELLENT_SCORE = 120; // New: Score for excellent hold release
    const HOLD_MEH_SCORE = 50; // New: Score for meh hold release

    // Get all relevant timing windows from preferences
    const PERFECT_WINDOW_MS = Preferences.prefs.gameplay.perfectWindowMs ?? 30;
    const EXCELLENT_WINDOW_MS = Preferences.prefs.gameplay.excellentWindowMs ?? 60;
    const GOOD_WINDOW_MS = Preferences.prefs.gameplay.goodWindowMs ?? 90;
    const MEH_WINDOW_MS = Preferences.prefs.gameplay.mehWindowMs ?? 150;

    function updateGameLoop(ticker: Ticker) {
        if (!pixiApp || phase === 'loading') return;

        const systemTime = performance.now();

        if (!isPaused) {
            // Calculate time based on system clock and gameTimeStartMs (which accounts for pauses)
            currentSongTimeMs = systemTime - gameTimeStartMs;

            // If authoritative audio time is available and sound is playing, apply smoothing
            if (authoritativeAudioTimeMs >= 0 && phase === 'playing') {
                const discrepancy = authoritativeAudioTimeMs - currentSongTimeMs;

                const SMOOTHING_RATE_PER_SECOND = 0.8; // Adjust for smoother/quicker sync (e.g., 0.2 for slower, 0.8 for faster)
                const correction = discrepancy * SMOOTHING_RATE_PER_SECOND * (ticker.deltaMS / 1000);

                currentSongTimeMs += correction;

                // IMPORTANT: After correcting currentSongTimeMs, update gameTimeStartMs
                // so that the next frame's `systemTime - gameTimeStartMs` starts from this corrected point.
                gameTimeStartMs = systemTime - currentSongTimeMs;
            }
        }
        // else if (isPaused), currentSongTimeMs remains unchanged. gameTimeStartMs is adjusted on resume.


        if (callbacks.onTimeUpdate) {
            callbacks.onTimeUpdate(currentSongTimeMs);
        }



        _renderLoopContent(currentSongTimeMs);

        // Iterate through all notes to check for hold logic
        notes.forEach(note => {
            if (note.note_type === 'hold' && !note.holdSatisfied && !note.holdBroken) {
                const holdEndTime = note.time + (note.duration ?? 0);
                const keyForLane = Preferences.prefs.gameplay.keybindings[note.lane];
                const isKeyPressed = keyForLane ? !!keyStates[keyForLane.toLowerCase()] : false;

                // Scenario 1: Key is up while it should be held (released before the start of the Meh window for end-of-hold judgment)
                if (note.isHolding && !isKeyPressed && currentSongTimeMs < holdEndTime - MEH_WINDOW_MS) {
                    note.isHolding = false;
                    note.holdBroken = true;
                    note.isMissed = true;
                    currentCombo = 0;
                    callbacks.onScoreUpdate(currentScore, currentCombo, maxCombo);
                    _spawnVisualJudgment(note, 'Hold Broken');
                    callbacks.onNoteMiss(note);
                }

                // Scenario 2: Current time is past the widest possible release window, and player is still holding (held too long)
                if (note.isHolding && currentSongTimeMs > holdEndTime + MEH_WINDOW_MS) {
                    note.isHolding = false;
                    note.holdBroken = true;
                    note.isMissed = true;
                    currentCombo = 0;
                    callbacks.onScoreUpdate(currentScore, currentCombo, maxCombo);
                    _spawnVisualJudgment(note, 'Hold Broken');
                    callbacks.onNoteMiss(note);
                } else if (!note.isHolding && !note.holdSatisfied && !note.holdBroken && currentSongTimeMs > holdEndTime + MEH_WINDOW_MS) {
                    // Fallback: If not holding, not satisfied/broken, but time is well past the note's end - mark as broken.
                    // This catches cases where a release might have been missed by handleKeyRelease (e.g., due to extreme lag or alt-tab at precise moment)
                    note.holdBroken = true;
                    note.isMissed = true;
                    currentCombo = 0;
                    callbacks.onScoreUpdate(currentScore, currentCombo, maxCombo);
                    _spawnVisualJudgment(note, 'Hold Broken');
                    callbacks.onNoteMiss(note);
                }
            }
        });

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
        // Timing windows are sourced from Preferences and available in this scope:
        // PERFECT_WINDOW_MS, EXCELLENT_WINDOW_MS, GOOD_WINDOW_MS, MEH_WINDOW_MS

        // Iterate forward from the upcomingNoteIndex
        for (let i = upcomingNoteIndex; i < notes.length; i++) {
            const note = notes[i];

            // Skip if not in the correct lane or already judged
            if (note.lane !== laneIndex || note.isHit || note.isMissed) {
                continue;
            }

            const timeDifference = note.time - currentSongTimeMs; // Negative if late, positive if early
            const absTimeDifference = Math.abs(timeDifference);

            // Check if the note is within the widest hittable window (Meh)
            if (absTimeDifference <= MEH_WINDOW_MS) {
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

                if (note.note_type === 'hold') {
                    note.isHolding = true;
                    // Visuals for active hold head/body will be handled in _renderLoopContent
                }

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

                // CRUCIAL: A note has been hit and processed. Exit the function
                // to ensure only this one note is hit for this key press.
                return;
            }

            // Optimization: If this note is too far in the future (player is too early for it),
            // and notes are sorted by time, then all subsequent notes in this lane
            // will also be too early. So, we can stop searching in this lane for this key press.
            if (timeDifference > MEH_WINDOW_MS) {
                break; // Exit the loop for this lane
            }
            // If timeDifference is negative and absTimeDifference > MEH_WINDOW_MS,
            // this note is too late (player pressed too late for it).
            // The `upcomingNoteIndex` advance logic in `updateGameLoop` should ideally
            // handle marking such notes as missed. We continue checking subsequent notes
            // in case upcomingNoteIndex hasn't caught up, though this note itself is not hittable.
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

        // Allow retry from playing/countdown (paused) states as well
        if (phase === 'loading' || phase === 'summary' || phase === 'finished' || phase === 'playing' || phase === 'countdown') {
            // If retrying from an active (even if paused) game state, clean up active components first
            if (phase === 'playing' || phase === 'countdown') {
                if (soundInstance) {
                    soundInstance.stop(); // Stop playback
                    soundInstance.destroy(); // Destroy the instance
                    soundInstance = null;
                }
                if (pixiApp && pixiApp.ticker) {
                    pixiApp.ticker.stop(); // Stop the game loop
                }
                if (countdownIntervalId) {
                    clearInterval(countdownIntervalId);
                    countdownIntervalId = null;
                }
            }

            currentScore = 0;
            currentCombo = 0;
            maxCombo = 0;
            currentSongTimeMs = 0;
            authoritativeAudioTimeMs = -1; // Reset authoritative audio time
            isPaused = false;
            // Clear old judgment texts by lane
            Object.values(judgmentTextsByLane).forEach(jt => {
                if (jt) jt.destroy();
            });
            judgmentTextsByLane = {}; // Reset the record
            pauseStartTimeMs = 0; // Reset pause time tracker

            // Clear active notes from the pool from previous session
            if (notePool) {
                for (const note of Array.from(notePool.getActiveNotes())) { // Iterate over a copy
                    notePool.releaseNote(note);
                }
            }

            processNotes();
            callbacks.onScoreUpdate(currentScore, currentCombo, maxCombo);
            setPhase('loading');
            loadAudio();


            if (sound && sound.isLoaded) {
                console.log('Audio is already loaded. Proceeding to countdown directly for retry.');
                setPhase('countdown'); // Ensure phase is countdown
                startCountdown();      // Start the countdown process
            } else if (sound) {

                console.log('Audio not yet loaded. Waiting for the initial loaded callback to proceed.');
            } else {
                // This case should ideally not happen if sound was initialized.
                console.error('Sound object is null/undefined in beginGameplaySequence. Cannot proceed with countdown.');
                // Consider setting an error phase or notifying the user.
            }
        } else {
            console.warn(`Cannot begin gameplay sequence from phase: ${phase}`);
        }
    }

    function handleResize() {
        if (!pixiApp) return;
        const parent = pixiApp.canvas.parentElement;
        if (parent) {
            pixiApp.renderer.resize(parent.clientWidth, parent.clientHeight);
            appWidth.set(pixiApp.screen.width);
            appHeight.set(pixiApp.screen.height);

            const newHighwayMetrics = getHighwayMetrics(chartData.lanes, pixiApp.screen.width, pixiApp.screen.height);

            // Update positions of static elements
            highwayGraphics.redraw();
            receptorGraphics.redraw();
            keyPressEffectGraphics.redraw();

            // Redraw notes using the new NotePool method
            redrawNoteGraphicsOnResize(
                notePool,
                newHighwayMetrics.x,
                newHighwayMetrics.laneWidth,
                currentSongTimeMs,
                newHighwayMetrics.receptorYPosition,
                newHighwayMetrics.receptorYPosition,
                currentSpeedMultiplier,
                pixiApp.screen.height
            );
        }
    }

    return {
        beginGameplaySequence,
        pauseGame: () => {
            if ((phase === 'playing' || phase === 'countdown') && !isPaused) {
                isPaused = true;
                pauseStartTimeMs = performance.now(); // Record pause start time
                if (soundInstance) soundInstance.paused = true;
                pixiApp?.ticker.stop();
                console.log("Game paused");
            }
        },
        resumeGame: () => {
            if (isPaused && (phase === 'playing' || phase === 'countdown')) {
                isPaused = false;
                if (pauseStartTimeMs > 0) { // Ensure pauseStartTimeMs was set
                    const pauseDuration = performance.now() - pauseStartTimeMs;
                    gameTimeStartMs += pauseDuration; // Adjust game start time
                    pauseStartTimeMs = 0; // Reset for next pause
                }
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
                if (highwayGraphics) highwayGraphics.triggerLaneIllumination(lane, true);
            }
        },
        handleKeyRelease: (key: string, event: KeyboardEvent) => {
            if (phase === 'summary' || phase === 'finished') return;

            const GOOD_WINDOW_MS = Preferences.prefs.gameplay.goodWindowMs ?? 90;

            const lane = Preferences.prefs.gameplay.keybindings.findIndex(
                (k) => k === key.toLowerCase()
            );
            if (lane !== -1) {
                keyStates[key.toLowerCase()] = false;
                if (receptorGraphics) receptorGraphics.receptors[lane]?.release();
                if (highwayGraphics) highwayGraphics.triggerLaneIllumination(lane, false);

                const activeHoldNote = notes.find(
                    (n) =>
                        n.lane === lane &&
                        n.note_type === 'hold' &&
                        n.isHolding && // Important: only consider if game logic thought it was being held
                        !n.holdSatisfied &&
                        !n.holdBroken
                );

                if (activeHoldNote) {
                    activeHoldNote.isHolding = false; // Player is no longer physically holding
                    const holdEndTime = activeHoldNote.time + (activeHoldNote.duration ?? 0);
                    const timeDifferenceFromEnd = currentSongTimeMs - holdEndTime;
                    const absTimeDifferenceFromEnd = Math.abs(timeDifferenceFromEnd);

                    let judgment = '';
                    let score = 0;
                    let legitimateRelease = false;

                    if (absTimeDifferenceFromEnd <= PERFECT_WINDOW_MS) {
                        judgment = 'Perfect';
                        score = HOLD_PERFECT_SCORE;
                        legitimateRelease = true;
                    } else if (absTimeDifferenceFromEnd <= EXCELLENT_WINDOW_MS) {
                        judgment = timeDifferenceFromEnd < 0 ? 'Early Excellent' : 'Late Excellent';
                        score = HOLD_EXCELLENT_SCORE;
                        legitimateRelease = true;
                    } else if (absTimeDifferenceFromEnd <= GOOD_WINDOW_MS) {
                        judgment = timeDifferenceFromEnd < 0 ? 'Early Good' : 'Late Good';
                        score = HOLD_GOOD_SCORE;
                        legitimateRelease = true;
                    } else if (absTimeDifferenceFromEnd <= MEH_WINDOW_MS) {
                        judgment = timeDifferenceFromEnd < 0 ? 'Early Meh' : 'Late Meh';
                        score = HOLD_MEH_SCORE;
                        legitimateRelease = true;
                    }

                    if (legitimateRelease) {
                        activeHoldNote.holdSatisfied = true;
                        activeHoldNote.isHit = true;
                        currentScore += score;
                        callbacks.onScoreUpdate(currentScore, currentCombo, maxCombo);
                        _spawnVisualJudgment(activeHoldNote, judgment);
                        callbacks.onNoteHit(activeHoldNote, judgment, Colors.LANE_COLORS[lane]);
                        const pooledNote = notePool.getActiveNoteById(activeHoldNote.id as number);
                        if (pooledNote) notePool.releaseNote(pooledNote);
                    } else {
                        // If not a legitimate release (too early before MEH window or too late after MEH window)
                        activeHoldNote.holdBroken = true;
                        activeHoldNote.isMissed = true;
                        currentCombo = 0;
                        callbacks.onScoreUpdate(currentScore, currentCombo, maxCombo);
                        _spawnVisualJudgment(activeHoldNote, 'Hold Broken');
                        callbacks.onNoteMiss(activeHoldNote);
                    }
                }
            }
        },
        handleResize: handleResize,
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
            if (notePool) {
                for (const note of notePool.getActiveNotes()) {
                    notePool.releaseNote(note);
                }
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
