import { Colors } from "./constants";
import type { JudgmentText } from "./constants";
import { type Application, type Container, Text, TextStyle } from "pixi.js";

export function drawJudgmentText(
	app: Application,
	parentContainer: Container,
	text: string,
	centerX: number,
	yPosition: number,
) {
	const upperText = text.toUpperCase();
	
	let glowColor = Colors.JUDGMENTS.PERFECT;
	if (upperText === "MISS") glowColor = Colors.JUDGMENTS.MISS;
	else if (upperText === "MEH") glowColor = Colors.JUDGMENTS.MEH;
	else if (upperText === "GOOD") glowColor = Colors.JUDGMENTS.GOOD;
	else if (upperText === "EXCELLENT") glowColor = Colors.JUDGMENTS.EXCELLENT;

	const style = new TextStyle({
		fontFamily: ["Inter", "Helvetica", "Arial", "sans-serif"],
		fontSize: 64, 
		fontWeight: "900",
		fontStyle: "italic",
		fill: "#ffffff", // Pure white text like combo number
		align: "center",
		letterSpacing: -3,
		dropShadow: {
			color: glowColor,
			blur: 15,
			alpha: 0.8,
			angle: 0,
			distance: 0,
		},
	});

	const judgmentText = new Text({ text: upperText, style }) as JudgmentText;
	judgmentText.anchor.set(0.5, 0.5);

	judgmentText.x = centerX;
	judgmentText.y = yPosition;
	judgmentText.alpha = 1;
	judgmentText.scale.set(0.8); // Start slightly smaller
	judgmentText.creationTime = app.ticker.lastTime;
	parentContainer.addChild(judgmentText);

	const animationDuration = 500; 
	let currentAnimationTime = 0;

	judgmentText.updateAnimation = function (deltaMs: number) {
		currentAnimationTime += deltaMs;
		const progress = Math.min(1, currentAnimationTime / animationDuration);

		// Fast Pop (matching .animate-pop feel)
		if (progress < 0.1) {
			const popProgress = progress / 0.1;
			const scale = 0.8 + 0.3 * popProgress; // Scale from 0.8 to 1.1
			this.scale.set(scale);
		} else if (progress < 0.2) {
			const settleProgress = (progress - 0.1) / 0.1;
			const scale = 1.1 - 0.1 * settleProgress; // Settle to 1.0
			this.scale.set(scale);
		} else {
			this.scale.set(1);
		}

		// Fade out and float up
		if (progress > 0.4) {
			const fadeProgress = (progress - 0.4) / 0.6;
			this.alpha = 1 - fadeProgress;
			this.y = yPosition - fadeProgress * 30;
		}
	};

	return judgmentText;
}

