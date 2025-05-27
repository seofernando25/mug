import * as PIXI from 'pixi.js';
import type { NoteJudgment } from '../../types'; // Assuming NoteJudgment type is available

export interface JudgmentStyle {
	text: string;
	fill: string | number;
	fontSize: number;
	fontFamily?: string;
	// Stroke properties removed for now due to linter/typing issues
}

export interface JudgmentAnimationConfig {
	durationMs: number;
	scaleFrom?: number;
	scaleTo?: number;
	alphaFrom?: number;
	alphaTo?: number;
	// Add more animation properties like movement if needed
}

export class JudgmentRenderer {
	public container: PIXI.Container;
	private judgmentText: PIXI.Text | null = null;
	private judgmentStyleMap: Map<NoteJudgment['type'], JudgmentStyle>;
	private currentAnimation: PIXI.Ticker | null = null;

	constructor(defaultStyles?: Map<NoteJudgment['type'], JudgmentStyle>) {
		this.container = new PIXI.Container();
		this.container.label = "JudgmentRenderer";
		this.judgmentStyleMap = defaultStyles || new Map([
			['perfect', { text: 'Perfect', fill: '#FFD700', fontSize: 48, fontFamily: 'Arial' }],
			['excellent', { text: 'Excellent', fill: '#00FF00', fontSize: 44, fontFamily: 'Arial' }],
			['good', { text: 'Good', fill: '#00BFFF', fontSize: 40, fontFamily: 'Arial' }],
			['meh', { text: 'Meh', fill: '#FFA500', fontSize: 36, fontFamily: 'Arial' }],
			['miss', { text: 'Miss', fill: '#FF0000', fontSize: 32, fontFamily: 'Arial' }],
		]);
	}

	public showJudgment(
		judgment: NoteJudgment,
		position: { x: number; y: number },
		animationConfig?: JudgmentAnimationConfig
	): void {
		if (this.currentAnimation) {
			this.currentAnimation.stop();
			this.currentAnimation.destroy();
			this.currentAnimation = null;
		}
		if (this.judgmentText) {
			this.judgmentText.destroy();
			this.judgmentText = null;
		}

		const style = this.judgmentStyleMap.get(judgment.type);
		if (!style) {
			console.warn(`No style defined for judgment type: ${judgment.type}`);
			return;
		}

		const pixiTextStyle = new PIXI.TextStyle({
			fill: style.fill,
			fontSize: style.fontSize,
			fontFamily: style.fontFamily || 'Arial',
			align: 'center',
		});

		this.judgmentText = new PIXI.Text(style.text, pixiTextStyle);
		this.judgmentText.anchor.set(0.5);
		this.judgmentText.position.set(position.x, position.y);
		this.container.addChild(this.judgmentText);

		if (animationConfig && this.judgmentText) {
			const anim = animationConfig;
			const jt = this.judgmentText;
			jt.scale.set(anim.scaleFrom !== undefined ? anim.scaleFrom : 1);
			jt.alpha = anim.alphaFrom !== undefined ? anim.alphaFrom : 1;

			let elapsed = 0;
			this.currentAnimation = new PIXI.Ticker();
			this.currentAnimation.add((ticker) => {
				elapsed += ticker.deltaMS;
				const progress = Math.min(elapsed / anim.durationMs, 1);

				if (anim.scaleTo !== undefined && anim.scaleFrom !== undefined) {
					jt.scale.set(anim.scaleFrom + (anim.scaleTo - anim.scaleFrom) * progress);
				}
				if (anim.alphaTo !== undefined && anim.alphaFrom !== undefined) {
					jt.alpha = anim.alphaFrom + (anim.alphaTo - anim.alphaFrom) * progress;
				}

				if (progress >= 1) {
					if (this.currentAnimation) {
						this.currentAnimation.stop();
						this.currentAnimation.destroy();
						this.currentAnimation = null;
					}
					if (anim.alphaTo === 0) { // If it fades out, remove it
						if (this.judgmentText) this.judgmentText.destroy();
						this.judgmentText = null;
					}
				}
			});
			this.currentAnimation.start();
		}
	}

	public updateStyles(newStyles: Map<NoteJudgment['type'], JudgmentStyle>): void {
		newStyles.forEach((style, type) => {
			this.judgmentStyleMap.set(type, style);
		});
	}

	public setVisibility(visible: boolean): void {
		this.container.visible = visible;
	}

	public destroy(): void {
		if (this.currentAnimation) {
			this.currentAnimation.stop();
			this.currentAnimation.destroy();
		}
		this.container.destroy({ children: true, texture: true });
	}
} 