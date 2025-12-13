import { type } from 'arktype';

// Keep the original type definitions for now - we'll migrate to ArkType schemas gradually
export type ClientPacket =
	| { op: 'ping' }
	| { op: 'noop' }
	| { op: 'create_room'; data?: { name?: string } }
	| { op: 'join_room'; data: { roomId: string } }
	| { op: 'leave_room'; data?: { roomId?: string } }
	| { op: 'get_room_state'; data: { roomId: string } }
	| { op: 'update_room'; data: { roomId: string; currentChart: { coverUrl?: string; name?: string; artist?: string; difficulty?: string; songId?: string; difficulties?: string[] } } }
	| { op: 'score_update'; data: { score: number; combo?: number; maxCombo?: number; noteId?: string | number; judgment?: string } }
	| { op: 'match_finished'; data?: { score?: number; maxCombo?: number } };

export type ServerPacket =
	| { op: 'pong'; data?: unknown }
	| { op: 'ack'; data?: unknown }
	| { op: 'error'; data: { code: 'UNAUTHORIZED' | 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL'; message?: string } }
	| { op: 'room_list'; data: Array<{ id: string; name: string; playerCount?: number; status?: string; hostId?: string | null; hostName?: string | null }> }
	| { op: 'room_event'; data: { type: 'add' | 'remove' | 'update'; room?: { id: string; name: string; playerCount?: number; status?: string; hostId?: string | null; hostName?: string | null } } }
	| { op: 'room_state'; data: { id: string; name?: string; hostId?: string | null; currentChart?: { coverUrl?: string; name?: string; artist?: string; difficulty?: string; songId?: string; difficulties?: string[] }; players: Array<{ userId: string; username?: string | null; avatarUrl?: string | null }> } }
	| { op: 'peer_score_update'; data: { userId: string; username?: string | null; score: number; combo?: number; maxCombo?: number; health?: number } }
	| { op: 'peer_match_finished'; data: { userId: string; finalScore: number; maxCombo?: number } }
	| { op: 'score_update'; data: { score: number; combo?: number; maxCombo?: number; noteId?: string | number; judgment?: string } }
	| { op: 'match_finished'; data?: { score?: number; maxCombo?: number } };

// --- ArkType Schemas (for future use and gradual migration) ---

// Shared schema definitions
const RoomInfoSchema = type({
	id: "string",
	name: "string",
	playerCount: "number?",
	status: "string?",
	hostId: "string|null?",
	hostName: "string|null?"
});

const PlayerInfoSchema = type({
	userId: "string",
	username: "string|null?",
	avatarUrl: "string|null?"
});

// Basic schemas for validation (not full union yet)
export const ClientPacketSchema = type({
	op: "string",
	data: "unknown?"
});

export const ServerPacketSchema = type({
	op: "string",
	data: "unknown?"
});

// --- Legacy assertion functions (for backward compatibility) ---

export function assertClientPacket(input: any): asserts input is ClientPacket {
	// Basic validation - check if it has an op field
	if (!input || typeof input !== 'object' || typeof input.op !== 'string') {
		throw new Error('Invalid packet');
	}

	// Validate based on op type
	switch (input.op) {
		case 'ping':
		case 'noop':
		case 'create_room':
		case 'leave_room':
		case 'match_finished':
			return;
		case 'join_room':
		case 'get_room_state':
			if (!input.data || typeof input.data.roomId !== 'string' || input.data.roomId.length === 0) {
				throw new Error(`${input.op} requires valid roomId`);
			}
			return;
		case 'update_room':
			if (!input.data || typeof input.data.roomId !== 'string' || input.data.roomId.length === 0) {
				throw new Error('update_room requires valid roomId');
			}
			if (!input.data.currentChart || typeof input.data.currentChart !== 'object') {
				throw new Error('update_room requires currentChart object');
			}
			return;
		case 'score_update':
			if (!input.data || typeof input.data.score !== 'number') {
				throw new Error('score_update requires numeric score');
			}
			return;
		default:
			throw new Error(`Unsupported client op: ${input.op}`);
	}
}

export function assertServerPacket(input: any): asserts input is ServerPacket {
	// Basic validation - check if it has an op field
	if (!input || typeof input !== 'object' || typeof input.op !== 'string') {
		throw new Error('Invalid server packet');
	}

	// Validate based on op type
	switch (input.op) {
		case 'pong':
		case 'ack':
		case 'error':
		case 'room_event':
		case 'match_finished':
			return;
		case 'room_list':
			if (!Array.isArray(input.data)) {
				throw new Error('room_list requires array data');
			}
			return;
		case 'room_state':
			if (!input.data || typeof input.data !== 'object' || typeof input.data.id !== 'string') {
				throw new Error('room_state requires valid data object with id');
			}
			if (!Array.isArray(input.data.players)) {
				throw new Error('room_state requires players array');
			}
			return;
		case 'peer_score_update':
		case 'peer_match_finished':
		case 'score_update':
			if (!input.data || typeof input.data !== 'object' || typeof input.data.userId !== 'string') {
				throw new Error(`${input.op} requires valid data object with userId`);
			}
			return;
		default:
			throw new Error(`Unsupported server op: ${input.op}`);
	}
}