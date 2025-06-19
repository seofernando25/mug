import { effect, type Atom } from 'nanostores';
import * as PIXI from 'pixi.js';
import type { GameplayNote, GameplaySong, NoteJudgment } from '../../types';
import { ProgressBarRenderer, type ProgressBarConfig } from '../ui/ProgressBarRenderer';
import { BackgroundRenderer } from './BackgroundRenderer';
import { type HitEffectConfig } from './EffectsRenderer';
import { type JudgmentAnimationConfig, type JudgmentStyle } from './JudgmentRenderer';
import { PlayfieldRenderer } from './PlayfieldRenderer';
import { type PlayfieldLayout, type PlayfieldSizingParams } from './PlayfieldSizer';
import { StatsRenderer, type StatsRendererConfig } from './StatsRenderer';

export interface MainGameRendererConfig {
	screenWidth: Atom<number>;
	screenHeight: Atom<number>;
	imageUrl: string | undefined;
	backgroundDimAmount: number;
	backgroundColor: number;

	playfieldSizing: PlayfieldSizingParams;
	judgmentStyles?: Map<NoteJudgment['type'], JudgmentStyle>;
	judgmentAnimation?: JudgmentAnimationConfig;
	stats?: StatsRendererConfig;
	progressBar?: ProgressBarConfig;
	numLanes: number;
}

export class MainGameRenderer {
	private app: PIXI.Application;
	private backgroundRenderer?: BackgroundRenderer;
	private playfieldRenderer: PlayfieldRenderer;
	// private judgmentRenderer: JudgmentRenderer;
	// private effectsRenderer: EffectsRenderer;
	private statsRenderer?: StatsRenderer;
	private progressBarRenderer?: ProgressBarRenderer;

	private currentPlayfieldLayout: PlayfieldLayout | null = null;

	constructor(app: PIXI.Application, 
		screenWidth: Atom<number>, 
		screenHeight: Atom<number>,
		song: GameplaySong
	) {
		this.app = app;

		this.backgroundRenderer = new BackgroundRenderer(screenWidth, screenHeight);
		this.backgroundRenderer.imageUrl.set(song.backgroundImageUrl);
		this.app.stage.addChild(this.backgroundRenderer);

		this.playfieldRenderer = new PlayfieldRenderer(screenWidth, screenHeight);
		this.app.stage.addChild(this.playfieldRenderer);


		effect([screenWidth, screenHeight], (w, h) => {
			const baseWidth = 1024;
			const baseHeight = 768;

			let scale = Math.min(w / baseWidth, h / baseHeight);			

			this.playfieldRenderer.scale.set(scale, scale);

			this.playfieldRenderer.x = (w - baseWidth * scale) / 2;
			this.playfieldRenderer.y = (h - baseHeight * scale) / 2;
		});

		// this.judgmentRenderer = new JudgmentRenderer(config.judgmentStyles);
		// this.app.stage.addChild(this.judgmentRenderer.container);

		// this.effectsRenderer = new EffectsRenderer();
		// this.app.stage.addChild(this.effectsRenderer.container);

		// if (config.stats) {
			// this.statsRenderer = new StatsRenderer(config.stats, config.screenWidth, config.screenHeight);
			// this.app.stage.addChild(this.statsRenderer.container);
		// }

		// if (config.progressBar) {
		// 	this.progressBarRenderer = new ProgressBarRenderer(config.progressBar);
		// 	this.app.stage.addChild(this.progressBarRenderer.container);
		// }

	}

	// private calculateAndApplyLayout(screenWidth: number, screenHeight: number): void {
		// this.currentPlayfieldLayout = PlayfieldSizer.calculateLayout(
		// 	screenWidth, screenHeight,
		// 	this._config.playfieldSizing
		// );

		// if (!this.currentPlayfieldLayout) {
		// 	console.error("Playfield layout could not be calculated.");
		// 	return;
		// }

		// this.playfieldRenderer.onResize({
		// 	...this._config.playfield,
		// 	x: this.currentPlayfieldLayout.position.x,
		// 	y: this.currentPlayfieldLayout.position.y,
		// 	scale: this.currentPlayfieldLayout.scale,
		// 	numLanes: this._config.numLanes,
		// });

		// Judgment and effects are typically positioned absolutely or relative to hits,
		// but their containers might need repositioning if they are meant to be globally centered
		// For now, assume they handle their own internal positioning relative to the stage or specific events.
	// }

	// public draw(config: MainGameRendererConfig): void {
		// this._config = config;
		// this.calculateAndApplyLayout(config.screenWidth, config.screenHeight);

		// if (this.currentPlayfieldLayout) {
		// 	this.playfieldRenderer.draw({
		// 		...this._config.playfield,
		// 		x: this.currentPlayfieldLayout.position.x,
		// 		y: this.currentPlayfieldLayout.position.y,
		// 		scale: this.currentPlayfieldLayout.scale,
		// 		numLanes: this._config.numLanes,
		// 	});
		// } else {
		// 	this.playfieldRenderer.draw(this._config.playfield);
		// }

		// if (config.judgmentStyles) {
		// 	this.judgmentRenderer.updateStyles(config.judgmentStyles);
		// }
		// EffectsRenderer is mostly event-driven
		// if (this.statsRenderer && config.stats) {
		// 	// StatsRenderer typically updates via specific methods, but onResize handles its layout
		// 	this.statsRenderer.onResize(config.screenWidth, config.screenHeight);
		// 	if (config.stats.textStyle) this.statsRenderer.updateTextStyle(config.stats.textStyle);
		// 	// Initial values are set in constructor, score/combo updates are via dedicated methods
		// }
	// }

	// public onResize(screenWidth: number, screenHeight: number): void {
		// this._config.screenWidth = screenWidth;
		// this._config.screenHeight = screenHeight;
		// this.calculateAndApplyLayout(screenWidth, screenHeight);
		// if (this.backgroundRenderer) {
		// 	this.backgroundRenderer.onResize(screenWidth, screenHeight);
		// }
		// if (this.statsRenderer) {
		// 	this.statsRenderer.onResize(screenWidth, screenHeight);
		// }
		// if (this.progressBarRenderer) {
		// 	this.progressBarRenderer.onResize(screenWidth, screenHeight);
		// }
	// }

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


	public showJudgment(judgment: NoteJudgment, position?: { x: number; y: number }): void {
		const displayPosition = position || {
			x: this._config.screenWidth / 2,
			y: (this._config.screenHeight / 2) - 50,
		};
		this.judgmentRenderer.showJudgment(judgment, displayPosition, this._config.judgmentAnimation);
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
			this.backgroundRenderer.visible = visible;
		}
		this.playfieldRenderer.visible = visible;
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