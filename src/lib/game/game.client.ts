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
	// 1) Initialize modules
	const engine = new RhythmEngine(chartData.hitObjects as ChartHitObject[], {
		timingWindows: {
			perfect: Preferences.prefs.gameplay.perfectWindowMs ?? 30,
			excellent: Preferences.prefs.gameplay.excellentWindowMs ?? 60,
			good: Preferences.prefs.gameplay.goodWindowMs ?? 90,
			meh: Preferences.prefs.gameplay.mehWindowMs ?? 150
		},
		scrollSpeed: chartData.noteScrollSpeed ?? 1.0
	});

	const sound = Sound.from(songData.audioUrl);
	// preload
	await new Promise<void>((resolve) => {
		if ((sound as any).isLoaded) return resolve();
		(sound as any).once?.('loaded', () => resolve());
	});
	sound.volume = get(masterVolume) * get(musicVolume);

	const clock = new AudioClock(sound);
	const renderer = new GameRenderer({
		canvas: canvasElement,
		lanes: chartData.lanes,
		scrollSpeed: chartData.noteScrollSpeed ?? 1
	});

	// 2) State
	let phase: GamePhase = 'loading';
	let isPaused = false;
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let rafId = 0;

	const setPhase = (p: GamePhase) => {
		phase = p;
		callbacks.onPhaseChange(p);
	};

	// 3) Loop
	const loop = () => {
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

			if (time > (sound.duration ?? 0) * 1000 + 1000) {
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
		setPhase('countdown');
		let count = 3;
		callbacks.onCountdownUpdate(count);

		countdownTimer = setInterval(async () => {
			count--;
			callbacks.onCountdownUpdate(count);
			if (count <= 0) {
				clearInterval(countdownTimer!);
				countdownTimer = null;
				await clock.play();
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

	if (process.env.BUN_TEST) {
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
		cleanup: () => {
			cancelAnimationFrame(rafId);
			if (countdownTimer) clearInterval(countdownTimer);
			clock.stop();
			renderer.destroy();
			sound.destroy();
		},
		handleResize: () => renderer.handleResize(),
		__setPhaseForTest: (p: GamePhase) => {
			phase = p;
		},
		__getEngineForTest: () => engine
	};
}

