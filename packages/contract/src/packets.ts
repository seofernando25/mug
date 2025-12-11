import { roomEventSchema } from './room';
import { ErrorCode } from './errors';

export type ClientPacket =
	| { op: 'ping' }
	| { op: 'noop' }
	| { op: 'create_room'; data?: { name?: string } }
	| { op: 'join_room'; data: { roomId: string } }
	| { op: 'leave_room'; data?: { roomId?: string } }
	| { op: 'get_room_state'; data: { roomId: string } }
	| { op: 'score_update'; data: { score: number; combo?: number; maxCombo?: number; noteId?: string | number; judgment?: string } }
	| { op: 'match_finished'; data?: { score?: number; maxCombo?: number } };

export type ServerPacket =
	| { op: 'pong'; data?: unknown }
	| { op: 'ack'; data?: unknown }
	| { op: 'error'; data: { code: ErrorCode; message?: string } }
	| { op: 'room_list'; data: Array<{ id: string; name: string; playerCount?: number; status?: string; hostId?: string | null; hostName?: string | null }> }
	| { op: 'room_event'; data: typeof roomEventSchema['infer'] | { type: 'add' | 'remove' | 'update'; room?: { id: string; name: string; playerCount?: number; status?: string; hostId?: string | null; hostName?: string | null } } }
	| { op: 'room_state'; data: { id: string; name?: string; hostId?: string | null; players: Array<{ userId: string; username?: string | null; avatarUrl?: string | null }> } }
	| { op: 'peer_score_update'; data: { userId: string; username?: string | null; score: number; combo?: number; maxCombo?: number; health?: number } }
	| { op: 'peer_match_finished'; data: { userId: string; finalScore: number; maxCombo?: number } }
	| { op: 'score_update'; data: { score: number; combo?: number; maxCombo?: number; noteId?: string | number; judgment?: string } }
	| { op: 'match_finished'; data?: { score?: number; maxCombo?: number } };

export function assertClientPacket(input: any): asserts input is ClientPacket {
	if (!input || typeof input !== 'object') throw new Error('Invalid packet');
	switch (input.op) {
		case 'ping':
		case 'noop':
		case 'leave_room':
		case 'create_room':
		case 'match_finished':
			return;
		case 'get_room_state':
			if (!input.data || typeof input.data.roomId !== 'string' || input.data.roomId.length === 0) throw new Error('get_room_state requires roomId');
			return;
		case 'join_room':
			if (!input.data || typeof input.data.roomId !== 'string' || input.data.roomId.length === 0) throw new Error('join_room requires roomId');
			return;
		case 'score_update':
			if (!input.data || typeof input.data.score !== 'number') throw new Error('score_update requires numeric score');
			return;
		default:
			throw new Error('Unsupported op');
	}
}

export function assertServerPacket(input: any): asserts input is ServerPacket {
	if (!input || typeof input !== 'object') throw new Error('Invalid server packet');
	switch (input.op) {
		case 'pong':
		case 'ack':
			return;
		case 'error':
			return;
		case 'room_event':
			return;
		case 'room_list':
			if (!Array.isArray(input.data)) throw new Error('room_list requires array data');
			for (const r of input.data) {
				if (!r || typeof r !== 'object' || typeof (r as any).id !== 'string') {
					throw new Error('room_list entries require id');
				}
			}
			return;
		case 'room_state':
			if (!input.data || typeof input.data !== 'object') throw new Error('room_state requires data object');
			if (typeof (input.data as any).id !== 'string') throw new Error('room_state requires id');
			if (!Array.isArray((input.data as any).players)) throw new Error('room_state requires players');
			return;
		case 'peer_score_update':
			if (input.data && typeof input.data === 'object') {
				const { userId, username, score, combo, maxCombo, health } = input.data as any;
				if (typeof userId !== 'string' || userId.length === 0) throw new Error('peer_score_update requires userId');
				if (username !== undefined && username !== null && typeof username !== 'string') throw new Error('username must be a string when provided');
				if (typeof score !== 'number' || Number.isNaN(score)) throw new Error('peer_score_update requires numeric score');
				if (combo !== undefined && (typeof combo !== 'number' || Number.isNaN(combo))) throw new Error('combo must be numeric');
				if (maxCombo !== undefined && (typeof maxCombo !== 'number' || Number.isNaN(maxCombo))) throw new Error('maxCombo must be numeric');
				if (health !== undefined && (typeof health !== 'number' || Number.isNaN(health))) throw new Error('health must be numeric');
			} else {
				throw new Error('peer_score_update requires data object');
			}
			return;
		case 'peer_match_finished':
			if (input.data && typeof input.data === 'object') {
				const { userId, finalScore, maxCombo } = input.data as any;
				if (typeof userId !== 'string' || userId.length === 0) throw new Error('peer_match_finished requires userId');
				if (typeof finalScore !== 'number' || Number.isNaN(finalScore)) throw new Error('peer_match_finished requires numeric finalScore');
				if (maxCombo !== undefined && (typeof maxCombo !== 'number' || Number.isNaN(maxCombo))) throw new Error('maxCombo must be numeric');
			} else {
				throw new Error('peer_match_finished requires data object');
			}
			return;
		case 'score_update':
			if (input.data && typeof input.data === 'object') {
				const { score, combo, maxCombo } = input.data as any;
				if (typeof score !== 'number' || Number.isNaN(score)) throw new Error('score_update requires numeric score');
				if (combo !== undefined && (typeof combo !== 'number' || Number.isNaN(combo))) throw new Error('combo must be numeric');
				if (maxCombo !== undefined && (typeof maxCombo !== 'number' || Number.isNaN(maxCombo))) throw new Error('maxCombo must be numeric');
			} else {
				throw new Error('score_update requires data object');
			}
			return;
		case 'match_finished':
			return;
		default:
			throw new Error('Unsupported server op');
	}
}

