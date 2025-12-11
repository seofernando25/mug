import { type } from 'arktype';

export const roomSummarySchema = type({
	id: 'number > 0',
	name: 'string>0',
	ownerId: 'string>0',
	currentChartId: 'string?',
	playerCount: 'number >= 0',
	isLocked: 'boolean',
});

export const roomEventSchema = type({
	op: "'room_event'",
	roomId: 'number > 0',
	event: "'join' | 'leave' | 'update'",
	payload: 'unknown?',
});

export type RoomSummary = typeof roomSummarySchema.infer;
export type RoomEvent = typeof roomEventSchema.infer;
export const assertRoomEvent = roomEventSchema.assert;

