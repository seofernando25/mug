import { gameSocket } from '$lib/network/socket';
import { Preferences } from '@mug/common';
import { masterVolume, musicVolume } from '$lib/stores/settingsStore';
import type { ClientSong } from '$lib/types';
import type { GameChart } from '$lib/types/game';
import { get } from 'svelte/store';
import { RhythmEngine, type ChartHitObject } from '@mug/engine';
import { AudioClock } from '@mug/engine';
import { GameRenderer } from '@mug/engine';
import { sound, Sound } from '@pixi/sound';

export type GamePhase = 'loading' | 'countdown' | 'playing' | 'finished' | 'summary';

export interface GameOptions {
	/**
	 * If true, the game will NOT automatically start the countdown after audio loads.
	 * Instead, it will call onAudioLoaded() and wait for startCountdown() to be called.
	 * Used for multiplayer to sync all players before starting.
	 */
	manualStart?: boolean;
}

export async function createGame(
	songData: ClientSong,
	chartData: GameChart,
	container: HTMLDivElement,
	callbacks: {
		onPhaseChange: (phase: GamePhase) => void;
		onCountdownUpdate: (value: number) => void;
		onSongEnd: () => void;
		onScoreUpdate: (score: number, combo: number, maxCombo: number) => void;
		onNoteHit: (note: { id: string | number; lane: number }, judgment: string) => void;
		onNoteMiss: (note: { id: string | number; lane: number }) => void;
		getGamePhase: () => GamePhase;
		getIsPaused: () => boolean;
		getCountdownValue: () => number;
		onTimeUpdate?: (time: number) => void;
		onAudioLoaded?: (durationMs: number) => void;
	},
	options: GameOptions = {}
) {
	// Attempt to resume AudioContext if suspended (common in multiplayer/autoplay scenarios)
	if (sound.context?.audioContext?.state === 'suspended') {
		sound.context.audioContext
			.resume()
			.catch((e: unknown) => console.warn('[MUG] Failed to resume AudioContext:', e));
	}

	if (chartData.hitObjects.length === 0) console.warn('[MUG] ⚠️ WARNING: Chart has 0 notes!');
	// 1) Initialize modules
	const engine = new RhythmEngine(chartData.hitObjects, {
		timingWindows: {
			perfect: Preferences.prefs.gameplay.perfectWindowMs ?? 30,
			excellent: Preferences.prefs.gameplay.excellentWindowMs ?? 60,
			good: Preferences.prefs.gameplay.goodWindowMs ?? 90,
			meh: Preferences.prefs.gameplay.mehWindowMs ?? 150
		},
		scrollSpeed: chartData.noteScrollSpeed ?? 1.0
	});

	let soundInstance: Sound | null = null;
	// preload using the official loaded callback (no any-casting)
	await new Promise<void>((resolve) => {
		let isResolved = false;

		const finish = (err: Error | null) => {
			if (isResolved) return;
			isResolved = true;
			if (err) {
				console.error('[MUG] ❌ Audio Failed to Load:', err);
			}
			resolve();
		};

		soundInstance = Sound.from({
			url: songData.audioUrl,
			preload: true,
			loaded: (err: Error | null) => finish(err)
		});

		if (soundInstance.isLoaded) {
			finish(null);
			return;
		}

		// Timeout safety valve
		setTimeout(() => {
			if (!isResolved) {
				finish(null);
			}
		}, 3000);
	});

	// Ensure we have a concrete sound instance for the rest of the flow
	if (!soundInstance) {
		soundInstance = Sound.from({ url: songData.audioUrl, preload: true });
	}

	soundInstance.volume = get(masterVolume) * get(musicVolume);

	// Subscribe to volume changes and update audio in real-time
	const masterVolumeUnsubscribe = masterVolume.subscribe((masterVol) => {
		if (soundInstance) soundInstance.volume = masterVol * get(musicVolume);
	});
	const musicVolumeUnsubscribe = musicVolume.subscribe((musicVol) => {
		if (soundInstance) soundInstance.volume = get(masterVolume) * musicVol;
	});

	const clock = new AudioClock(soundInstance);
	const renderer = new GameRenderer({
		container: container,
		lanes: chartData.lanes ?? 4,
		scrollSpeed: chartData.noteScrollSpeed ?? 1
	});
	await renderer.init();

	// Calculate last note time once
	let lastNoteTime = 0;
	if (chartData.hitObjects?.length) {
		const validStartTimes = chartData.hitObjects
			.map((ho) => ho.time)
			.filter((startTime) => typeof startTime === 'number' && !Number.isNaN(startTime));

		if (validStartTimes.length > 0) {
			lastNoteTime = Math.max(...validStartTimes);
		}
	}
	// 2) State
	let phase: GamePhase = 'loading';
	let isPaused = false;
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let countdownCount = 3;
	let rafId = 0;
	let started = false;
	let audioFinished = false;
	let leadInEndTime = 0;

	function setPhase(p: GamePhase) {
		phase = p;
		callbacks.onPhaseChange(p);
	}

	// 3) Loop
	function loop() {
		if (isPaused) {
			rafId = requestAnimationFrame(loop);
			return;
		}

		if (phase === 'countdown') {
			const now = performance.now();
			const timeRemaining = leadInEndTime - now;
			const time = -timeRemaining; // Negative time relative to start (0)

			// Update Countdown UI
			const currentCount = Math.ceil(timeRemaining / 1000);
			if (currentCount !== countdownCount) {
				countdownCount = currentCount;
				callbacks.onCountdownUpdate(Math.max(0, countdownCount));
			}

			// Render notes approaching
			renderer.render(engine.state, time);

			// Check if lead-in is finished
			if (timeRemaining <= 0) {
				setPhase('playing');
				// Start Audio
				clock.play(() => {
					audioFinished = true;
				});
			}
		} else if (phase === 'playing') {
			const time = clock.currentTimeMs;
			const events = engine.update(time);

			for (const e of events) {
				if (e.type === 'hit' && e.judgment) {
					const note = { id: e.noteId, lane: e.lane };
					callbacks.onNoteHit(note, e.judgment);
					renderer.showJudgment(e.lane, e.judgment);
					renderer.flashLane(e.lane);
				} else if (e.type === 'miss' || e.type === 'hold_broken') {
					const note = { id: e.noteId, lane: e.lane };
					callbacks.onNoteMiss(note);
					renderer.showJudgment(e.lane, 'Miss');
				}

				// score sync + WS
				callbacks.onScoreUpdate(engine.state.score, engine.state.combo, engine.state.maxCombo);
				if (gameSocket) {
					gameSocket.send('score_update', {
						score: engine.state.score,
						combo: engine.state.combo,
						maxCombo: engine.state.maxCombo,
						noteId: e.noteId,
						judgment: e.judgment || 'Miss'
					});
				}
			}

			callbacks.onTimeUpdate?.(time);
			renderer.render(engine.state, time);

			if (audioFinished) {
				endGame();
				return;
			}

			const audioDurationMs = (soundInstance?.duration ?? 0) * 1000;
			const maxChartTime = lastNoteTime + 3000;
			const safetyFallbackTime = Math.max(audioDurationMs + 1000, maxChartTime + 5000);

			if (time > safetyFallbackTime) {
				endGame();
				return;
			}
		}
		rafId = requestAnimationFrame(loop);
	}

	// 4) Input
	function handleKeyPress(key: string) {
		if (isPaused || phase !== 'playing') return;
		const lane = Preferences.prefs.gameplay.keybindings.indexOf(key.toLowerCase());
		if (lane === -1) return;

		renderer.flashLane(lane);
		const result = engine.submitInput(lane, clock.currentTimeMs);
		if (result && result.type === 'hit' && result.judgment) {
			callbacks.onNoteHit({ id: result.noteId, lane }, result.judgment);
			renderer.showJudgment(lane, result.judgment);
			callbacks.onScoreUpdate(engine.state.score, engine.state.combo, engine.state.maxCombo);
			if (gameSocket) {
				gameSocket.send('score_update', {
					score: engine.state.score,
					combo: engine.state.combo,
					maxCombo: engine.state.maxCombo,
					noteId: result.noteId,
					judgment: result.judgment || 'Miss'
				});
			}
		}
	}

	function handleKeyRelease(key: string) {
		if (phase !== 'playing') return;
		const lane = Preferences.prefs.gameplay.keybindings.indexOf(key.toLowerCase());
		if (lane !== -1) {
			engine.releaseInput(lane, clock.currentTimeMs);
		}
	}

	// 5) Lifecycle
	function startSequence() {
		if (started) return;
		started = true;
		setPhase('countdown');
		// 3 seconds lead-in
		leadInEndTime = performance.now() + 3000;
		countdownCount = 3;
		callbacks.onCountdownUpdate(countdownCount);

		// Start the loop immediately to render approaching notes
		rafId = requestAnimationFrame(loop);
	}

	function endGame() {
		cancelAnimationFrame(rafId);
		setPhase('finished');
		callbacks.onSongEnd();
		if (gameSocket) {
			gameSocket.send('match_finished', {
				score: engine.state.score,
				maxCombo: engine.state.maxCombo
			});
		}
		setTimeout(() => setPhase('summary'), 2000);
	}

	const isTestEnv = typeof process !== 'undefined' && !!process.env?.BUN_TEST;

	// Notify that audio is loaded (for multiplayer ready-up)
	if (soundInstance) {
		callbacks.onAudioLoaded?.(soundInstance.duration * 1000);
	}

	if (isTestEnv) {
		setPhase('playing');
		loop(); // Trigger the loop immediately in test mode
	} else if (!options.manualStart) {
		// Solo mode: start immediately
		startSequence();
	}
	// If manualStart is true, wait for startCountdown() to be called

	return {
		pauseGame: () => {
			isPaused = true;
			clock.pause();
			console.log('Paused game');
		},
		resumeGame: () => {
			isPaused = false;
			clock.resume();
			if (phase === 'countdown') {
				leadInEndTime = performance.now() + countdownCount * 1000;
			}
		},
		handleKeyPress,
		handleKeyRelease,
		beginGameplaySequence: () => {
			if (started) return;
			if (isTestEnv) {
				setPhase('playing');
				loop();
			} else {
				startSequence();
			}
		},
		/**
		 * Start the countdown sequence. Used for multiplayer when all players are ready.
		 * @param durationMs Optional countdown duration in ms (default 3000)
		 */
		startCountdown: (_durationMs: number = 3000) => {
			if (started) {
				return;
			}
			startSequence();
		},
		cleanup: () => {
			cancelAnimationFrame(rafId);
			if (countdownTimer) clearInterval(countdownTimer);
			// Unsubscribe from volume changes
			masterVolumeUnsubscribe();
			musicVolumeUnsubscribe();
			clock.stop();
			renderer.destroy();
			if (soundInstance) {
				soundInstance.destroy();
			}
		},
		handleResize: () => renderer.handleResize(clock.currentTimeMs),
		getHighwayMetrics: () => {
			const metrics = get(renderer.highwayMetricsStore);
			return metrics;
		},
		...(isTestEnv && {
			__setPhaseForTest: (p: GamePhase) => {
				phase = p;
			},
			__getEngineForTest: () => engine
		})
	};
}
