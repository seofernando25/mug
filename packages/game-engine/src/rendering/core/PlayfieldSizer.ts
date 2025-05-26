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
}

interface PlayfieldDesign {
	width: number;
	height: number;
}

export class PlayfieldSizer {
	// Constants adapted from the osu!mania example for portrait mode
	private static readonly PORTRAIT_DEFAULT_TARGET_ASPECT_RATIO = 4 / 3;
	private static readonly PORTRAIT_DEFAULT_MIN_MARGIN = 0.05;
	private static readonly PORTRAIT_DEFAULT_MAX_UPSCALE_RATIO = 1.5;
	private static readonly PORTRAIT_BASE_UPSCALE = 1.25;
	private static readonly PORTRAIT_REFERENCE_HEIGHT_FOR_CALC = 768.0;
	private static readonly PORTRAIT_HORIZONTAL_MARGIN_FACTOR = 0.90;

	// Constants for landscape mode reference
	private static readonly LANDSCAPE_DEFAULT_REFERENCE_WIDTH = 1024;
	private static readonly LANDSCAPE_TARGET_DESIGN_WIDTH = 1024.0;
	private static readonly LANDSCAPE_TARGET_DESIGN_HEIGHT = 768.0;

	public static calculateLayout(
		screenWidth: number,
		screenHeight: number,
		params: PlayfieldSizingParams
	): PlayfieldLayout {
		const aspectRatio = screenWidth / screenHeight;
		const isPortrait = aspectRatio < 1.0;

		let scaleValue: number;
		const debugInfo: PlayfieldLayout['debug'] = {
			aspectRatio,
			isPortrait,
		};

		const playfieldDesign: PlayfieldDesign = {
			width: params.playfieldDesignWidth,
			height: params.playfieldDesignHeight,
		};

		if (isPortrait) {
			debugInfo.strategy = 'Portrait Mode (Fit to Adjusted Target with Margins and Upscaling)';

			const targetAspectRatio = params.targetAspectRatio || this.PORTRAIT_DEFAULT_TARGET_ASPECT_RATIO;
			const minMargin = params.minMargin || this.PORTRAIT_DEFAULT_MIN_MARGIN;
			const maxUpscaleRatio = params.maxUpscaleRatio || this.PORTRAIT_DEFAULT_MAX_UPSCALE_RATIO;

			const availableWidth = screenWidth * (1 - (minMargin * 2));
			const availableHeight = screenHeight * (1 - (minMargin * 2));

			let scaleToFitWidth = availableWidth / playfieldDesign.width;
			let scaleToFitHeight = availableHeight / playfieldDesign.height;

			scaleValue = Math.min(scaleToFitWidth, scaleToFitHeight);
			scaleValue = Math.min(scaleValue, maxUpscaleRatio);

			debugInfo.targetWidth = playfieldDesign.width * scaleValue;
			debugInfo.targetHeight = playfieldDesign.height * scaleValue;

		} else {
			debugInfo.strategy = 'Landscape Mode (Cover Reference Design)';
			const referenceWidth = params.referenceWidth || this.LANDSCAPE_DEFAULT_REFERENCE_WIDTH;

			const scaleToCoverRefWidth = this.LANDSCAPE_TARGET_DESIGN_WIDTH / playfieldDesign.width;
			const scaleToCoverRefHeight = this.LANDSCAPE_TARGET_DESIGN_HEIGHT / playfieldDesign.height;
			scaleValue = Math.max(scaleToCoverRefWidth, scaleToCoverRefHeight);
		}

		const positionX = screenWidth / 2;
		const positionY = screenHeight / 2;

		return {
			scale: scaleValue,
			position: { x: positionX, y: positionY },
			debug: debugInfo,
		};
	}
} 