// Core engine exports
export { GameEngine, type GameEngineCallbacks, type GameEngineCorePhase } from './src/core/GameEngine';
export { EventQueue } from './src/core/EventQueue';

// Configuration exports
export { type GameConfig, DEFAULT_CONFIG } from './src/config/GameConfig';
export { type ColorConfig, DEFAULT_COLORS } from './src/config/ColorConfig';
export { type LayoutConfig, DEFAULT_LAYOUT } from './src/config/LayoutConfig';

// Type exports
export type { GameplaySong } from './src/types/ChartTypes';
export type {
	GameplayNote,
	NoteJudgment,
	NoteState,
	TapNoteState,
	HoldNoteState,
	NoteInfo,
	HitObject
} from './src/types/NoteTypes';

// Gameplay system exports
export { GameplayManager, type GameplayCallbacks } from './src/gameplay/GameplayManager';
export { TimingWindows } from './src/gameplay/TimingWindows';
export { ScoreSystem } from './src/gameplay/ScoreSystem';
export { ComboTracker } from './src/gameplay/ComboTracker';

// Rendering exports
export { PlayfieldRenderer } from './src/rendering/core/PlayfieldRenderer';

// Web integration
export { WebGame, type WebGameCallbacks, type WebGameConfig } from './src/web/WebGame'; 