import { RhythmEngine } from '$lib/game-engine/engine';
import { AudioClock } from '$lib/game-engine/clock';
import { GameRenderer } from '$lib/game-engine/renderer';
import { gameSocket } from '$lib/network/socket';
import { Preferences } from '$lib/preferences';
import { masterVolume, musicVolume } from '$lib/stores/settingsStore';
import type { ClientChart, ClientSong, ChartHitObject } from '$lib/types';
import { Sound } from '@pixi/sound';
import { get } from 'svelte/store';

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
		onNoteHit: (note: any, judgment: string) => void;
		onNoteMiss: (note: any) => void;
		getGamePhase: () => GamePhase;
		getIsPaused: () => boolean;
		getCountdownValue: () => number;
		onTimeUpdate?: (time: number) => void;
	}
) {
	console.log(`[MUG] 1. Initializing Game. Chart has ${chartData.hitObjects.length} notes.`);
	if (chartData.hitObjects.length === 0) console.warn('[MUG] ⚠️ WARNING: Chart has 0 notes!');
	// 1) Initialize modules
	const engine = new RhythmEngine(chartData.hitObjects as ChartHitObject[], {
		timingWindows: {
			perfect: Preferences.prefs.gameplay.perfectWindowMs ?? 30,
			excellent: Preferences.prefs.gameplay.excellentWindowMs ?? 60,
			good: Preferences.prefs.gameplay.goodWindowMs ?? 90,
			meh: Preferences.prefs.gameplay.mehWindowMs ?? 150
		},
		scrollSpeed: (chartData as any).noteScrollSpeed ?? 1.0
	});

	let sound: Sound | null = null;
	// preload using the official loaded callback (no any-casting)
	console.log(`[MUG] 2. Starting Audio Load for URL: "${songData.audioUrl}"`);

	await new Promise<void>((resolve) => {
		let isResolved = false;

		const finish = (err: Error | null) => {
			if (isResolved) return;
			isResolved = true;
			if (err) {
				console.error('[MUG] ❌ Audio Failed to Load:', err);
				console.warn('[MUG] Continuing without audio...');
			} else {
				console.log('[MUG] 2c. Audio loaded successfully.');
			}
			resolve();
		};

		sound = Sound.from({
			url: songData.audioUrl,
			preload: true,
			loaded: (err) => finish(err)
		});

		if (sound.isLoaded) {
			console.log('[MUG] 2a. Fast path loaded.');
			finish(null);
			return;
		}

		// Timeout safety valve
		setTimeout(() => {
			if (!isResolved) {
				console.warn('[MUG] ⚠️ Audio Load Timed Out (3s). Force starting game...');
				finish(null);
			}
		}, 3000);
	});
	// Ensure we have a concrete sound instance for the rest of the flow
	const soundInstance = sound ?? Sound.from({ url: songData.audioUrl, preload: true });
	sound = soundInstance;
	soundInstance.volume = get(masterVolume) * get(musicVolume);

	const clock = new AudioClock(soundInstance);
	const renderer = new GameRenderer({
		canvas: canvasElement,
		lanes: (chartData as any).lanes ?? 4,
		scrollSpeed: (chartData as any).noteScrollSpeed ?? 1
	});
	console.log('[MUG] 3. Initializing Renderer...');
	await renderer.init();
	console.log('[MUG] 4. Renderer Ready.');

	// 2) State
	let phase: GamePhase = 'loading';
	let isPaused = false;
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let rafId = 0;
	let started = false;

	const setPhase = (p: GamePhase) => {
		phase = p;
		callbacks.onPhaseChange(p);
	};

	let hasLoggedFrame = false;
	// 3) Loop
	const loop = () => {
		if (!hasLoggedFrame) {
			console.log(`[MUG] 5. Loop active. Phase: ${phase}, Paused: ${isPaused}, Time: ${clock.currentTimeMs}`);
			hasLoggedFrame = true;
		}
		if (phase === 'playing' && !isPaused) {
			const time = clock.currentTimeMs;
			const events = engine.update(time);

			for (const e of events) {
				if (e.type === 'hit') {
					const note = { id: e.noteId, lane: e.lane };
					callbacks.onNoteHit(note, e.judgment!);
					renderer.showJudgment(e.lane, e.judgment!);
					renderer.flashLane(e.lane);
				} else if (e.type === 'miss' || e.type === 'hold_broken') {
					const note = { id: e.noteId, lane: e.lane };
					callbacks.onNoteMiss(note);
					renderer.showJudgment(e.lane, 'Miss');
				}

				// score sync + WS
				callbacks.onScoreUpdate(engine.state.score, engine.state.combo, engine.state.maxCombo);
				if (gameSocket && (gameSocket as any).send) {
					gameSocket.send({
						op: 'score_update',
						data: {
							score: engine.state.score,
							combo: engine.state.combo,
							maxCombo: engine.state.maxCombo,
							noteId: e.noteId,
							judgment: e.judgment || 'Miss'
						}
					});
				}
			}

			callbacks.onTimeUpdate?.(time);
			renderer.render(engine.state, time);

			if (time > (soundInstance.duration ?? 0) * 1000 + 1000) {
				endGame();
				return;
			}
		}
		rafId = requestAnimationFrame(loop);
	};

	// 4) Input
	const handleKeyPress = (key: string) => {
		if (isPaused || phase !== 'playing') return;
		const lane = Preferences.prefs.gameplay.keybindings.indexOf(key.toLowerCase());
		if (lane === -1) return;

		renderer.flashLane(lane);
		const result = engine.submitInput(lane, clock.currentTimeMs);
		if (result && result.type === 'hit') {
			callbacks.onNoteHit({ id: result.noteId, lane }, result.judgment!);
			renderer.showJudgment(lane, result.judgment!);
			callbacks.onScoreUpdate(engine.state.score, engine.state.combo, engine.state.maxCombo);
			if (gameSocket && (gameSocket as any).send) {
				gameSocket.send({
					op: 'score_update',
					data: {
						score: engine.state.score,
						combo: engine.state.combo,
						maxCombo: engine.state.maxCombo,
						noteId: result.noteId,
						judgment: result.judgment || 'Miss'
					}
				});
			}
		}
	};

	const handleKeyRelease = (key: string) => {
		if (phase !== 'playing') return;
		const lane = Preferences.prefs.gameplay.keybindings.indexOf(key.toLowerCase());
		if (lane !== -1) {
			engine.releaseInput(lane, clock.currentTimeMs);
		}
	};

	// 5) Lifecycle
	const startSequence = () => {
		if (started) return;
		started = true;
		setPhase('countdown');
		let count = 3;
		callbacks.onCountdownUpdate(count);

		countdownTimer = setInterval(async () => {
			count--;
			console.log(`[MUG] Countdown: ${count}`);
			callbacks.onCountdownUpdate(count);
			if (count <= 0) {
				clearInterval(countdownTimer!);
				console.log('[MUG] 3. Countdown finished. Calling clock.play()...');
				countdownTimer = null;
				await clock.play();
				console.log('[MUG] 4. clock.play() resolved. Starting loop.');
				setPhase('playing');
				loop();
			}
		}, 1000);
	};

	const endGame = () => {
		cancelAnimationFrame(rafId);
		setPhase('finished');
		callbacks.onSongEnd();
		if (gameSocket && (gameSocket as any).send) {
			gameSocket.send({
				op: 'match_finished',
				data: { score: engine.state.score, maxCombo: engine.state.maxCombo }
			});
		}
		setTimeout(() => setPhase('summary'), 2000);
	};

	const isTestEnv = typeof process !== 'undefined' && !!process.env?.BUN_TEST;

	if (isTestEnv) {
		setPhase('playing');
		loop(); // Trigger the loop immediately in test mode
	} else {
		startSequence();
	}

	return {
		pauseGame: () => {
			isPaused = true;
			clock.pause();
		},
		resumeGame: () => {
			isPaused = false;
			clock.resume();
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
		cleanup: () => {
			cancelAnimationFrame(rafId);
			if (countdownTimer) clearInterval(countdownTimer);
			clock.stop();
			renderer.destroy();
			soundInstance.destroy();
		},
		handleResize: () => renderer.handleResize(),
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

