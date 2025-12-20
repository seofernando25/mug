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
	const style = new TextStyle({
		fontFamily: "Arial",
		fontSize: 48, // Increased font size for visibility
		fontWeight: "bold",
		fill: text === "Miss" ? Colors.JUDGMENT_MISS : Colors.JUDGMENT_HIT,
		stroke: { color: "#000000", width: 4 }, // Thicker stroke
		align: "center",
		dropShadow: {
			color: "#000000",
			blur: 4,
			angle: Math.PI / 6,
			distance: 6,
		},
	});

	const judgmentText = new Text({ text, style }) as JudgmentText;
	judgmentText.anchor.set(0.5, 0.5);

	judgmentText.x = centerX;
	judgmentText.y = yPosition;
	judgmentText.alpha = 1;
	judgmentText.scale.set(0.5); // Start small for pop-in effect
	judgmentText.creationTime = app.ticker.lastTime;
	parentContainer.addChild(judgmentText);

	const animationDuration = 500; // ms
	let currentAnimationTime = 0;

	judgmentText.updateAnimation = function (deltaMs: number) {
		currentAnimationTime += deltaMs;
		const progress = Math.min(1, currentAnimationTime / animationDuration);

		// Pop in effect
		if (progress < 0.2) {
			const popProgress = progress / 0.2;
			const scale = 0.5 + 0.7 * Math.sin(popProgress * Math.PI); // Bounce to 1.2
			this.scale.set(scale);
		} else {
			this.scale.set(1);
		}

		// Fade out and move up slightly at the end
		if (progress > 0.5) {
			const fadeProgress = (progress - 0.5) / 0.5;
			this.alpha = 1 - fadeProgress;
			this.y = yPosition - fadeProgress * 20;
		}

		// TODO: remove from parent and destroy when animation is complete
		// handled by renderer
	};

	return judgmentText;
}
