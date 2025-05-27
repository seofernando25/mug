import * as PIXI from 'pixi.js';

export interface StatsRendererConfig {
	initialScore?: number;
	initialCombo?: number;
	scorePrefix?: string;
	comboPrefix?: string;
	textStyle?: Partial<PIXI.TextStyleOptions>;
	xPaddingPercent?: number; // e.g., 0.05 for 5%
	yPaddingPercent?: number; // e.g., 0.05 for 5%
	spacingBetween?: number; // Vertical pixels between score and combo
	visible?: boolean;
}

const DEFAULT_TEXT_STYLE: Partial<PIXI.TextStyleOptions> = {
	fontFamily: 'Arial',
	fontSize: 24,
	fill: 'white',
	align: 'left',
};

export class StatsRenderer {
	public container: PIXI.Container;
	private scoreText: PIXI.Text;
	private comboText: PIXI.Text;

	private config: StatsRendererConfig;
	private currentScore: number;
	private currentCombo: number;

	private screenWidth: number = 0;
	private screenHeight: number = 0;

	constructor(initialConfig: StatsRendererConfig, screenWidth: number, screenHeight: number) {
		this.container = new PIXI.Container();
		this.container.label = "StatsRenderer";
		this.config = {
			initialScore: 0,
			initialCombo: 0,
			scorePrefix: 'Score: ',
			comboPrefix: 'Combo: ',
			textStyle: { ...DEFAULT_TEXT_STYLE },
			xPaddingPercent: 0.05,
			yPaddingPercent: 0.05,
			spacingBetween: 10,
			visible: true,
			...initialConfig,
		};
		// Merge provided textStyle with defaults
		this.config.textStyle = { ...DEFAULT_TEXT_STYLE, ...initialConfig.textStyle };

		this.currentScore = this.config.initialScore!;
		this.currentCombo = this.config.initialCombo!;
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;

		const combinedStyle = new PIXI.TextStyle(this.config.textStyle);

		this.scoreText = new PIXI.Text('', combinedStyle);
		this.scoreText.anchor.set(0, 0); // Align top-left

		this.comboText = new PIXI.Text('', combinedStyle);
		this.comboText.anchor.set(0, 0); // Align top-left

		this.container.addChild(this.scoreText);
		this.container.addChild(this.comboText);

		this.updateScore(this.currentScore);
		this.updateCombo(this.currentCombo);
		this.setVisibility(this.config.visible!);
		this.applyLayout();
	}

	private applyLayout(): void {
		if (!this.scoreText || !this.comboText) return;

		const xPos = this.screenWidth * this.config.xPaddingPercent!;
		const yPosScore = this.screenHeight * this.config.yPaddingPercent!;

		this.scoreText.x = xPos;
		this.scoreText.y = yPosScore;

		this.comboText.x = xPos;
		this.comboText.y = yPosScore + this.scoreText.height + this.config.spacingBetween!;

		this.container.x = 0; // Container itself is at root
		this.container.y = 0;
	}

	public updateScore(newScore: number): void {
		this.currentScore = newScore;
		this.scoreText.text = `${this.config.scorePrefix}${this.currentScore}`;
		// Re-apply layout if text height might change and affect combo position
		this.applyLayout();
	}

	public updateCombo(newCombo: number): void {
		this.currentCombo = newCombo;
		if (this.currentCombo > 0) {
			this.comboText.text = `${this.config.comboPrefix}${this.currentCombo}`;
			this.comboText.visible = true;
		} else {
			this.comboText.text = ''; // Or some other placeholder like "---"
			this.comboText.visible = false; // Hide combo if 0
		}
	}

	public updateTextStyle(newStyle: Partial<PIXI.TextStyleOptions>): void {
		this.config.textStyle = { ...this.config.textStyle, ...newStyle };
		const combinedStyle = new PIXI.TextStyle(this.config.textStyle as PIXI.TextStyleOptions);
		this.scoreText.style = combinedStyle;
		this.comboText.style = combinedStyle;
		this.applyLayout(); // Height might change
	}

	public onResize(screenWidth: number, screenHeight: number): void {
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;
		this.applyLayout();
	}

	public setVisibility(visible: boolean): void {
		this.container.visible = visible;
		this.config.visible = visible;
	}

	public destroy(): void {
		this.container.destroy({ children: true, texture: true });
	}
} 