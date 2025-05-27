export function getNoteYPosition(
	noteTime: number,
	currentTime: number,
	receptorY: number,
	scrollSpeed: number,
	_canvasHeight: number
): number {
	const timeDifference = noteTime - currentTime;
	// Simplify the scroll speed calculation - scrollSpeed should be pixels per second
	const pixelOffset = (timeDifference / 1000) * scrollSpeed;
	return receptorY - pixelOffset;
} 