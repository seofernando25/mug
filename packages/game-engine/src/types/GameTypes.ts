export type GamePhase = 'idle' | 'loading' | 'countdown' | 'playing' | 'paused' | 'finished';

export interface GameCallbacks {
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