import type { ColorConfig } from './ColorConfig';
import { DEFAULT_COLORS } from './ColorConfig';
import type { LayoutConfig } from './LayoutConfig';
import { DEFAULT_LAYOUT } from './LayoutConfig';

export interface TimingConfig {
	perfectWindowMs: number;
	excellentWindowMs: number;
	goodWindowMs: number;
	mehWindowMs: number;
}

export interface GameConfig {
	colors: ColorConfig;
	layout: LayoutConfig;
	timing: TimingConfig;
	keybindings: string[];
	countdownSeconds?: number;
}

export const DEFAULT_TIMING: TimingConfig = {
	perfectWindowMs: 30,
	excellentWindowMs: 60,
	goodWindowMs: 90,
	mehWindowMs: 150,
};

export const DEFAULT_CONFIG: GameConfig = {
	colors: DEFAULT_COLORS,
	layout: DEFAULT_LAYOUT,
	timing: DEFAULT_TIMING,
	keybindings: ['d', 'f', 'j', 'k'],
	countdownSeconds: 3,
}; 