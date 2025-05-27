export interface PlayfieldLayout {
	scale: number;
	position: { x: number; y: number };
	debug?: {
		strategy?: string;
		targetWidth?: number;
		targetHeight?: number;
		aspectRatio?: number;
		isPortrait?: boolean;
	};
}

export interface PlayfieldSizingParams {
	playfieldDesignWidth: number;
	playfieldDesignHeight: number;
	targetAspectRatio?: number;
	referenceWidth?: number;
	minMargin?: number;
	maxUpscaleRatio?: number;
	// osu!mania specific parameters
	portraitBaseScale?: number; // Default 1.25 for mobile playability
	portraitSideGap?: number; // Default 0.9 (90% width usage)
	landscapeTargetWidth?: number; // Default 1024
	landscapeTargetHeight?: number; // Default 768
}

interface PlayfieldDesign {
	width: number;
	height: number;
}

export class PlayfieldSizer {
	// osu!mania inspired constants
	private static readonly OSU_PORTRAIT_BASE_SCALE = 1.25;
	private static readonly OSU_PORTRAIT_SIDE_GAP = 0.9;
	private static readonly OSU_LANDSCAPE_TARGET_WIDTH = 1024;

	public static calculateLayout(
		screenWidth: number,
		screenHeight: number,
		params: PlayfieldSizingParams
	): PlayfieldLayout {
		const aspectRatio = screenWidth / screenHeight;
		const isPortrait = aspectRatio < 1.0;

		let scaleValue: number;
		let targetWidth: number;
		let targetHeight: number;

		const debugInfo: PlayfieldLayout['debug'] = {
			aspectRatio,
			isPortrait,
		};

		const playfieldDesign: PlayfieldDesign = {
			width: params.playfieldDesignWidth,
			height: params.playfieldDesignHeight,
		};

		console.log('PlayfieldSizer:', {
			screenWidth,
			screenHeight,
			aspectRatio,
			isPortrait,
			playfieldDesign
		});

		if (isPortrait) {
			debugInfo.strategy = 'Portrait Mode (osu!mania Maximum Strategy)';

			// osu!mania portrait strategy:
			// Scale playfield up by 25% to become playable on mobile devices,
			// and leave a 10% horizontal gap if the playfield is scaled down due to being too wide.
			const baseScale = params.portraitBaseScale || this.OSU_PORTRAIT_BASE_SCALE;
			const baseWidth = 768 / baseScale; // 768 / 1.25 = 614.4
			const sideGap = params.portraitSideGap || this.OSU_PORTRAIT_SIDE_GAP;

			// Calculate target dimensions using Maximum strategy
			const stageWidth = playfieldDesign.width;
			targetWidth = params.landscapeTargetWidth || this.OSU_LANDSCAPE_TARGET_WIDTH; // 1024
			targetHeight = baseWidth * Math.max(stageWidth / aspectRatio / (baseWidth * sideGap), 1.0);

			// Calculate scale to fit target dimensions within screen
			const scaleToFitWidth = screenWidth / targetWidth;
			const scaleToFitHeight = screenHeight / targetHeight;
			scaleValue = Math.max(scaleToFitWidth, scaleToFitHeight); // Maximum strategy

			debugInfo.targetWidth = targetWidth * scaleValue;
			debugInfo.targetHeight = targetHeight * scaleValue;

		} else {
			debugInfo.strategy = 'Landscape Mode (Full Height with Progress Bar Space)';

			// In landscape mode, use full window height but leave 10% at bottom for progress bar
			const progressBarReservedSpace = 0.1; // 10% of screen height
			const availableHeight = screenHeight * (1 - progressBarReservedSpace);

			// Use the playfield design aspect ratio to calculate appropriate width
			const playfieldAspectRatio = playfieldDesign.width / playfieldDesign.height;

			// Calculate target dimensions to fill available height
			targetHeight = availableHeight;
			targetWidth = targetHeight * playfieldAspectRatio;

			// If the calculated width exceeds screen width, scale down proportionally
			if (targetWidth > screenWidth) {
				const widthScale = screenWidth / targetWidth;
				targetWidth = screenWidth;
				targetHeight = targetHeight * widthScale;
			}

			// Scale is 1:1 since we calculated target dimensions to fit exactly
			scaleValue = 1.0;

			debugInfo.targetWidth = targetWidth;
			debugInfo.targetHeight = targetHeight;
		}

		const positionX = screenWidth / 2;
		let positionY: number;


		positionY = screenHeight / 2;
		const result = {
			scale: scaleValue,
			position: { x: positionX, y: positionY },
			debug: debugInfo,
		};

		console.log('PlayfieldSizer result:', result);
		return result;
	}
} 