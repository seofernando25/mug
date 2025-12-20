export function getNoteYPosition(
	noteTimeMs: number,
	currentTimeMs: number,
	receptorYPosition: number,
	speedMultiplier: number, // User's preferred speed setting
	canvasHeight: number
) {
	const pixelsPerSecondBase = canvasHeight * 0.6; // Travels 60% of screen height per second at 1x
	const timeDifferenceSeconds = (noteTimeMs - currentTimeMs) / 1000;
	const effectiveScrollSpeed = pixelsPerSecondBase * speedMultiplier;
	return receptorYPosition - timeDifferenceSeconds * effectiveScrollSpeed;
}

export function getEditorNoteYPosition(
	noteTimeMs: number,
	editorViewCenterTimeMs: number,
	editorPixelsPerSecond: number,
	canvasHeight: number
): number {
	const centerScreenY = canvasHeight / 2;
	const timeDifferenceMs = noteTimeMs - editorViewCenterTimeMs;
	const pixelDifference = timeDifferenceMs * (editorPixelsPerSecond / 1000); // ms to s
	return centerScreenY + pixelDifference;
}
