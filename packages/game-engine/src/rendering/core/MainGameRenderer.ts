import * as PIXI from 'pixi.js';
import type { GameplayNote, NoteJudgment } from '../../types';
import { PlayfieldSizer, type PlayfieldSizingParams, type PlayfieldLayout } from './PlayfieldSizer';
import { PlayfieldRenderer, type PlayfieldRendererConfig } from './PlayfieldRenderer';
import { JudgmentRenderer, type JudgmentStyle, type JudgmentAnimationConfig } from './JudgmentRenderer';
import { EffectsRenderer, type HitEffectConfig } from './EffectsRenderer';
import { StatsRenderer, type StatsRendererConfig } from './StatsRenderer';
import { ProgressBarRenderer, type ProgressBarConfig } from '../ui/ProgressBarRenderer';
import { BackgroundRenderer, type BackgroundConfig } from './BackgroundRenderer';

export interface MainGameRendererConfig {
	playfieldSizing: PlayfieldSizingParams;
	playfield: PlayfieldRendererConfig;
	judgmentStyles?: Map<NoteJudgment['type'], JudgmentStyle>;
	judgmentAnimation?: JudgmentAnimationConfig;
	stats?: StatsRendererConfig;
	progressBar?: ProgressBarConfig;
	background?: BackgroundConfig;
	screenWidth: number;
	screenHeight: number;
	numLanes: number;
}

export class MainGameRenderer {
	private app: PIXI.Application;
	private backgroundRenderer?: BackgroundRenderer;
	private playfieldRenderer: PlayfieldRenderer;
	private judgmentRenderer: JudgmentRenderer;
	private effectsRenderer: EffectsRenderer;
	private statsRenderer?: StatsRenderer;
	private progressBarRenderer?: ProgressBarRenderer;

	private config: MainGameRendererConfig;
	private currentPlayfieldLayout: PlayfieldLayout | null = null;

	constructor(app: PIXI.Application, initialConfig: MainGameRendererConfig) {
		this.app = app;
		this.config = initialConfig;

		// Background renderer should be added first (bottom layer)
		if (initialConfig.background) {
			this.backgroundRenderer = new BackgroundRenderer(initialConfig.background);
			this.app.stage.addChild(this.backgroundRenderer.container);
		}

		this.playfieldRenderer = new PlayfieldRenderer(this.app.stage, initialConfig.playfield);

		this.judgmentRenderer = new JudgmentRenderer(initialConfig.judgmentStyles);
		this.app.stage.addChild(this.judgmentRenderer.container);

		this.effectsRenderer = new EffectsRenderer();
		this.app.stage.addChild(this.effectsRenderer.container);

		if (initialConfig.stats) {
			this.statsRenderer = new StatsRenderer(initialConfig.stats, initialConfig.screenWidth, initialConfig.screenHeight);
			this.app.stage.addChild(this.statsRenderer.container);
		}

		if (initialConfig.progressBar) {
			this.progressBarRenderer = new ProgressBarRenderer(initialConfig.progressBar);
			this.app.stage.addChild(this.progressBarRenderer.container);
		}

		this.draw(initialConfig);
	}

	private calculateAndApplyLayout(screenWidth: number, screenHeight: number): void {
		this.currentPlayfieldLayout = PlayfieldSizer.calculateLayout(
			screenWidth, screenHeight,
			this.config.playfieldSizing
		);

		if (!this.currentPlayfieldLayout) {
			console.error("Playfield layout could not be calculated.");
			return;
		}

		this.playfieldRenderer.onResize({
			...this.config.playfield,
			x: this.currentPlayfieldLayout.position.x,
			y: this.currentPlayfieldLayout.position.y,
			scale: this.currentPlayfieldLayout.scale,
			numLanes: this.config.numLanes,
		});

		// Judgment and effects are typically positioned absolutely or relative to hits,
		// but their containers might need repositioning if they are meant to be globally centered
		// For now, assume they handle their own internal positioning relative to the stage or specific events.
	}

	public draw(config: MainGameRendererConfig): void {
		this.config = config;
		this.calculateAndApplyLayout(config.screenWidth, config.screenHeight);

		if (this.currentPlayfieldLayout) {
			this.playfieldRenderer.draw({
				...this.config.playfield,
				x: this.currentPlayfieldLayout.position.x,
				y: this.currentPlayfieldLayout.position.y,
				scale: this.currentPlayfieldLayout.scale,
				numLanes: this.config.numLanes,
			});
		} else {
			this.playfieldRenderer.draw(this.config.playfield);
		}

		if (config.judgmentStyles) {
			this.judgmentRenderer.updateStyles(config.judgmentStyles);
		}
		// EffectsRenderer is mostly event-driven
		if (this.statsRenderer && config.stats) {
			// StatsRenderer typically updates via specific methods, but onResize handles its layout
			this.statsRenderer.onResize(config.screenWidth, config.screenHeight);
			if (config.stats.textStyle) this.statsRenderer.updateTextStyle(config.stats.textStyle);
			// Initial values are set in constructor, score/combo updates are via dedicated methods
		}
	}

	public onResize(screenWidth: number, screenHeight: number): void {
		this.config.screenWidth = screenWidth;
		this.config.screenHeight = screenHeight;
		this.calculateAndApplyLayout(screenWidth, screenHeight);
		if (this.backgroundRenderer) {
			this.backgroundRenderer.onResize(screenWidth, screenHeight);
		}
		if (this.statsRenderer) {
			this.statsRenderer.onResize(screenWidth, screenHeight);
		}
		if (this.progressBarRenderer) {
			this.progressBarRenderer.onResize(screenWidth, screenHeight);
		}
	}

	public update(songTimeMs: number): void {
		this.playfieldRenderer.updateNotes(songTimeMs);
		// No specific per-frame update needed for StatsRenderer unless animating text
	}

	// --- Passthrough methods to sub-renderers ---

	public addNote(noteData: GameplayNote): void {
		this.playfieldRenderer.addNote(noteData);
	}

	public removeNote(noteId: number): void {
		this.playfieldRenderer.removeNote(noteId);
	}

	public activateReceptor(lane: number): void {
		this.playfieldRenderer.activateReceptor(lane);
	}

	public deactivateReceptor(lane: number): void {
		this.playfieldRenderer.deactivateReceptor(lane);
	}

	public showJudgment(judgment: NoteJudgment, position?: { x: number; y: number }): void {
		const displayPosition = position || {
			x: this.config.screenWidth / 2,
			y: (this.config.screenHeight / 2) - 50,
		};
		this.judgmentRenderer.showJudgment(judgment, displayPosition, this.config.judgmentAnimation);
	}

	public spawnHitEffect(effectConfig: HitEffectConfig): void {
		this.effectsRenderer.spawnHitEffect(effectConfig);
	}

	public updateScore(score: number): void {
		if (this.statsRenderer) {
			this.statsRenderer.updateScore(score);
		}
	}

	public updateCombo(combo: number): void {
		if (this.statsRenderer) {
			this.statsRenderer.updateCombo(combo);
		}
	}

	public updateProgress(progress: number): void {
		if (this.progressBarRenderer) {
			this.progressBarRenderer.updateProgress(progress);
		}
	}

	public updateProgressBarConfig(config: ProgressBarConfig): void {
		if (this.progressBarRenderer) {
			this.progressBarRenderer.updateConfig(config);
		}
	}

	public updateBackgroundConfig(config: BackgroundConfig): void {
		if (this.backgroundRenderer) {
			this.backgroundRenderer.updateConfig(config);
		}
	}

	public setVisibility(visible: boolean): void {
		if (this.backgroundRenderer) {
			this.backgroundRenderer.setVisibility(visible);
		}
		this.playfieldRenderer.setVisibility(visible);
		this.judgmentRenderer.setVisibility(visible);
		this.effectsRenderer.setVisibility(visible);
		if (this.statsRenderer) {
			this.statsRenderer.setVisibility(visible);
		}
		if (this.progressBarRenderer) {
			this.progressBarRenderer.setVisibility(visible);
		}
	}

	public destroy(): void {
		if (this.backgroundRenderer) {
			this.backgroundRenderer.destroy();
		}
		this.playfieldRenderer.destroy();
		this.judgmentRenderer.destroy();
		this.effectsRenderer.destroy();
		if (this.statsRenderer) {
			this.statsRenderer.destroy();
		}
		if (this.progressBarRenderer) {
			this.progressBarRenderer.destroy();
		}
	}
} 