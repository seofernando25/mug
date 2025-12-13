import type { NotePool } from "./NotePool";

export function redrawNoteGraphicsOnResize(
	notePool: NotePool,
	highwayX: number,
	laneWidth: number,
	songTimeMs: number,
	hitZoneY: number,
	receptorYPosition: number,
	scrollSpeed: number,
	canvasHeight: number,
	isEditorMode: boolean,
	editorViewCenterTimeMs: number,
	editorPixelsPerSecond: number,
) {
	notePool.updateGraphicsOnResize(
		laneWidth,
		highwayX,
		songTimeMs,
		hitZoneY,
		receptorYPosition,
		scrollSpeed,
		canvasHeight,
		isEditorMode,
		editorViewCenterTimeMs,
		editorPixelsPerSecond,
	);
}
