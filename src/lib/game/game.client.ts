import { Preferences } from '$lib/preferences';
import { gameSocket } from '$lib/network/socket';
import { masterVolume, musicVolume } from '$lib/stores/settingsStore';
import type { ClientChart, ClientSong } from '$lib/types';
import { Colors } from '$lib/types';
import { Sound } from '@pixi/sound';
import { RhythmEngine } from '$lib/game-engine/engine';
import { AudioClock } from '$lib/game-engine/clock';
import { GameRenderer } from '$lib/game-engine/renderer';
import type { GameEvent } from '$lib/game-engine/types';
import { USE_WS_MULTIPLAYER } from '$lib/featureFlags';

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
		onNoteHit: (note: any, judgment: string, color?: number) => void;
		onNoteMiss: (note: any) => void;
		getGamePhase: () => GamePhase;
		getIsPaused: () => boolean;
		getCountdownValue: () => number;
		onTimeUpdate?: (currentTimeMs: number) => void;
	}
) {
	let phase: GamePhase = 'loading';
	let isPaused = false;
	let countdownValue = 3;
	let countdownIntervalId: ReturnType<typeof setInterval> | null = null;
	let finishAnimationTimerId: ReturnType<typeof setTimeout> | null = null;
	let rafId: number | null = null;

	const sound = Sound.from({
		url: songData.audioUrl,
		preload: true
	});
	sound.volume = masterVolume.get() * musicVolume.get();

	const engine = new RhythmEngine(chartData.hitObjects, {
		timingWindows: {
			perfect: Preferences.prefs.gameplay.perfectWindowMs || 30,
			excellent: Preferences.prefs.gameplay.excellentWindowMs || 60,
			good: Preferences.prefs.gameplay.goodWindowMs || 90,
			meh: Preferences.prefs.gameplay.mehWindowMs || 150
		},
		scrollSpeed: chartData.noteScrollSpeed ?? 1
	});
	const clock = new AudioClock(sound);
	const renderer = new GameRenderer({
		canvas: canvasElement,
		lanes: chartData.lanes,
		scrollSpeed: chartData.noteScrollSpeed ?? 1
	});

	const setPhase = (p: GamePhase) => {
		phase = p;
		callbacks.onPhaseChange(p);
	};

	const processEvents = (events: GameEvent[]) => {
		for (const e of events) {
			if (e.type === 'hit' && e.judgment) {
				const note = engine.state.notes.find((n) => n.id === e.noteId);
				if (note) {
					const color = Colors.LANE_COLORS[note.lane % Colors.LANE_COLORS.length];
					renderer.flashLane(note.lane);
					renderer.showJudgment(note.lane, e.judgment, color);
					callbacks.onNoteHit(note, e.judgment, color);
					if (USE_WS_MULTIPLAYER) {
						gameSocket.send({
							op: 'send_score',
							score: engine.state.score,
							combo: engine.state.combo,
							maxCombo: engine.state.maxCombo
						});
					}
				}
			} else if (e.type === 'miss') {
				const note = engine.state.notes.find((n) => n.id === e.noteId);
				if (note) {
					callbacks.onNoteMiss(note);
				}
				if (USE_WS_MULTIPLAYER) {
					gameSocket.send({
						op: 'send_score',
						score: engine.state.score,
						combo: engine.state.combo,
						maxCombo: engine.state.maxCombo
					});
				}
			}
		}
		callbacks.onScoreUpdate(engine.state.score, engine.state.combo, engine.state.maxCombo);
	};

	const tick = () => {
		const now = clock.currentTimeMs;
		callbacks.onTimeUpdate?.(now);
		const events = engine.update(now);
		processEvents(events);
		renderer.render(engine.state, now);
		rafId = requestAnimationFrame(tick);
	};

	const startCountdown = () => {
		setPhase('countdown');
		countdownValue = 3;
		callbacks.onCountdownUpdate(countdownValue);

		if (countdownIntervalId) clearInterval(countdownIntervalId);
		countdownIntervalId = setInterval(async () => {
			countdownValue -= 1;
			callbacks.onCountdownUpdate(countdownValue);
			if (countdownValue <= 0) {
				clearInterval(countdownIntervalId as ReturnType<typeof setInterval>);
				countdownIntervalId = null;
				await clock.play();
				setPhase('playing');
				tick();
			}
		}, 1000);
	};

	const beginGameplaySequence = () => {
		if (phase === 'playing') return;
		startCountdown();
	};

	const pauseGame = () => {
		if (phase !== 'playing' || isPaused) return;
		isPaused = true;
		clock.pause();
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	};

	const resumeGame = () => {
		if (phase !== 'playing' || !isPaused) return;
		isPaused = false;
		clock.resume();
		tick();
	};

	const togglePause = () => {
		if (isPaused) resumeGame();
		else pauseGame();
	};

	const handleKeyPress = (key: string, evt?: KeyboardEvent) => {
		if (isPaused || phase !== 'playing') return;
		const lane = Preferences.getLaneForKey(key);
		if (lane === -1) return;
		const res = engine.submitInput(lane, clock.currentTimeMs);
		if (res && res.type === 'hit' && res.judgment) {
			const note = engine.state.notes.find((n) => n.id === res.noteId);
			if (note) {
				const color = Colors.LANE_COLORS[lane % Colors.LANE_COLORS.length];
				renderer.flashLane(lane);
				renderer.showJudgment(lane, res.judgment, color);
				callbacks.onNoteHit(note, res.judgment, color);
			}
		}
	};

	const handleKeyRelease = (key: string, evt?: KeyboardEvent) => {
		if (phase !== 'playing') return;
		const lane = Preferences.getLaneForKey(key);
		if (lane === -1) return;
		engine.releaseInput(lane, clock.currentTimeMs);
	};

	const destroyGame = () => {
		if (countdownIntervalId) clearInterval(countdownIntervalId);
		if (finishAnimationTimerId) clearTimeout(finishAnimationTimerId);
		if (rafId !== null) cancelAnimationFrame(rafId);
		renderer.destroy();
		clock.stop();
	};

	return {
		beginGameplaySequence,
		handleKeyPress,
		handleKeyRelease,
		pauseGame,
		resumeGame,
		togglePause,
		destroyGame,
		get currentScore() {
			return engine.state.score;
		},
		get currentCombo() {
			return engine.state.combo;
		},
		get maxCombo() {
			return engine.state.maxCombo;
		},
		get currentSongTimeMs() {
			return clock.currentTimeMs;
		},
		get isPaused() {
			return isPaused;
		},
		get phase() {
			return phase;
		},
		get countdownValue() {
			return countdownValue;
		}
	};
}

