import { type } from 'arktype';

export const roomSummarySchema = type({
	id: 'string>0',
	name: 'string>0',
	playerCount: 'number >= 0?',
	status: 'string?',
	hostId: 'string?',
	hostName: 'string?',
	currentChart: type({
		coverUrl: 'string?',
		name: 'string?',
		artist: 'string?',
		difficultyName: 'string?'
	}).optional(),
	isPasswordProtected: 'boolean?',
	owner: type({
		id: 'string>0',
		name: 'string?',
		avatarUrl: 'string?'
	}).optional()
});

export const roomEventSchema = type({
	op: "'room_event'",
	roomId: 'number > 0',
	event: "'join' | 'leave' | 'update'",
	payload: 'unknown?'
});

export type RoomSummary = typeof roomSummarySchema.infer;
export type RoomEvent = typeof roomEventSchema.infer;
export const assertRoomEvent = roomEventSchema.assert;
