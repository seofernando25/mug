import { roomEventSchema } from './room';
import { ErrorCode } from './errors';

export type ClientPacket =
	| { op: 'ping' }
	| { op: 'noop' }
	| { op: 'create_room'; data?: { name?: string } }
	| { op: 'join_room'; data: { roomId: string } }
	| { op: 'leave_room'; data?: { roomId?: string } }
	| { op: 'score_update'; data: { score: number; combo?: number; maxCombo?: number; noteId?: string | number; judgment?: string } }
	| { op: 'match_finished'; data?: { score?: number; maxCombo?: number } };

export type ServerPacket =
	| { op: 'pong'; data?: unknown }
	| { op: 'ack'; data?: unknown }
	| { op: 'error'; data: { code: ErrorCode; message?: string } }
	| { op: 'room_event'; data: typeof roomEventSchema['infer'] | unknown };

export function assertClientPacket(input: any): asserts input is ClientPacket {
	if (!input || typeof input !== 'object') throw new Error('Invalid packet');
	switch (input.op) {
		case 'ping':
		case 'noop':
		case 'leave_room':
		case 'create_room':
		case 'match_finished':
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
		case 'error':
		case 'room_event':
			return;
		default:
			throw new Error('Unsupported server op');
	}
}

