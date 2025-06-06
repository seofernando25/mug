import type { ChartHitObject } from '$lib/types';
import type { NotePool } from './NotePool';
import { HoldNote } from './HoldNote'; // HoldNote is needed for instanceof check

export const Timing = {
	LOOKAHEAD_SECONDS: 3.0,
	NOTE_RENDER_GRACE_PERIOD_MS: 500
};

export function updateNotes(
	songTimeMs: number,
	notePool: NotePool,
	highwayX: number,
	laneWidth: number,
	hitZoneY: number, // Y-coordinate for pinning active holds
	receptorYPosition: number, // Y-coordinate for general scroll calculation reference
	scrollSpeed: number,
	canvasHeight: number,
	visibleOrUpcomingHitObjects: Array<ChartHitObject & { isActivelyHeld?: boolean }>,
	judgedNoteIds: ReadonlySet<number>
): void {
	const lookaheadMs = Timing.LOOKAHEAD_SECONDS * 1000;
	const minVisibleTime = songTimeMs - Timing.NOTE_RENDER_GRACE_PERIOD_MS;
	const maxVisibleTime = songTimeMs + lookaheadMs;
	const processedNoteIdsInFrame = new Set<number>();

	visibleOrUpcomingHitObjects.forEach(noteData => {
		const noteId = noteData.id;
		processedNoteIdsInFrame.add(noteId);
		let activeNote = notePool.getActiveNoteById(noteId);
		const noteStartTime = noteData.time;
		const currentDuration = noteData.duration ?? 0;
		const noteEndTime = noteData.time + currentDuration;
		const isPotentiallyVisible = noteStartTime <= maxVisibleTime && noteEndTime >= minVisibleTime;
		const isJudgedByGame = judgedNoteIds.has(noteId);

		if (isJudgedByGame) {
			if (!activeNote) return;
			activeNote.isJudged = true;
			activeNote.isActivelyHeld = noteData.isActivelyHeld ?? false;
			if (activeNote.note_type === 'tap') {
				notePool.releaseNote(activeNote);
			} else if (activeNote instanceof HoldNote) {
				activeNote.reposition(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
				if (activeNote.isOffscreen(canvasHeight, receptorYPosition, songTimeMs, scrollSpeed)) {
					notePool.releaseNote(activeNote);
				}
			}
			return;
		}

		if (isPotentiallyVisible) {
			if (!activeNote) {
				activeNote = notePool.getNote(noteData);
			}
			activeNote.isActivelyHeld = noteData.isActivelyHeld ?? false;
			activeNote.reposition(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
			if (!activeNote.isVisible) {
				activeNote.show();
			}
		} else {
			if (activeNote && activeNote.isVisible) {
				notePool.releaseNote(activeNote);
			}
		}
	});

	for (const activeNote of Array.from(notePool.getActiveNotes())) {
		if (processedNoteIdsInFrame.has(activeNote.id)) continue;

		if (activeNote.isJudged) {
			if (activeNote.note_type === 'tap') {
				notePool.releaseNote(activeNote);
				continue;
			}
			activeNote.reposition(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
			if (activeNote.isOffscreen(canvasHeight, receptorYPosition, songTimeMs, scrollSpeed)) {
				notePool.releaseNote(activeNote);
			}
		} else {
			activeNote.isActivelyHeld = false;
			activeNote.reposition(highwayX, songTimeMs, hitZoneY, receptorYPosition, scrollSpeed, canvasHeight);
			if (activeNote.isOffscreen(canvasHeight, receptorYPosition, songTimeMs, scrollSpeed)) {
				notePool.releaseNote(activeNote);
			}
		}
	}
} 