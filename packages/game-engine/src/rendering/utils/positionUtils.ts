export function getNoteYPosition(
	noteTime: number,
	currentTime: number,
	receptorY: number,
	scrollSpeed: number,
	canvasHeight: number
): number {
	const timeDifference = noteTime - currentTime;
	const scrollPixelsPerSecond = canvasHeight * 0.6 * scrollSpeed;
	const pixelOffset = (timeDifference / 1000) * scrollPixelsPerSecond;
	return receptorY - pixelOffset;
} 