import { describe, expect, it } from 'bun:test';
import { type } from 'arktype';
import { ClientPacketSchema, ServerPacketSchema } from './packets';

describe('Contract Integrity', () => {
	it('validates a correct join_room packet', () => {
		const payload = { op: 'join_room', data: { roomId: 'room-123' } };
		const result = ClientPacketSchema(payload);
		expect(result instanceof type.errors).toBe(false);
	});

	it('rejects a malformed packet (missing roomId)', () => {
		const payload = { op: 'join_room', data: {} };
		const result = ClientPacketSchema(payload);
		expect(result instanceof type.errors).toBe(true);
	});

	it('validates a correct start_match packet', () => {
		const payload = { op: 'start_match', data: { roomId: 'room-123' } };
		const result = ClientPacketSchema(payload);
		expect(result instanceof type.errors).toBe(false);
	});

	it('rejects start_match with missing roomId', () => {
		const payload = { op: 'start_match', data: {} };
		const result = ClientPacketSchema(payload);
		expect(result instanceof type.errors).toBe(true);
	});

	it('validates score_update with numbers', () => {
		const payload = { op: 'score_update', data: { score: 100000, combo: 50 } };
		const result = ClientPacketSchema(payload);
		expect(result instanceof type.errors).toBe(false);
	});

	it('rejects score_update with invalid data', () => {
		const payload = { op: 'score_update', data: { score: 'invalid' } };
		const result = ClientPacketSchema(payload);
		expect(result instanceof type.errors).toBe(true);
	});

	it('validates update_room with valid data', () => {
		const payload = {
			op: 'update_room',
			data: {
				roomId: 'room123',
				currentChart: {
					coverUrl: 'http://example.com/image.jpg',
					name: 'Test Song',
					artist: 'Test Artist',
					difficulty: 'Hard',
					songId: 'song123',
					difficulties: ['Easy', 'Hard']
				}
			}
		};
		const result = ClientPacketSchema(payload);
		expect(result instanceof type.errors).toBe(false);
	});

	it('rejects update_room with missing roomId', () => {
		const payload = {
			op: 'update_room',
			data: { currentChart: {} }
		};
		const result = ClientPacketSchema(payload);
		expect(result instanceof type.errors).toBe(true);
	});

	it('rejects update_room with invalid currentChart', () => {
		const payload = {
			op: 'update_room',
			data: { roomId: 'room123', currentChart: 'invalid' }
		};
		const result = ClientPacketSchema(payload);
		expect(result instanceof type.errors).toBe(true);
	});

	it('validates a room_list packet', () => {
		const pkt = {
			op: 'room_list',
			data: [{ id: 'r1', name: 'Room', playerCount: 2, status: 'idle' }]
		};
		const result = ServerPacketSchema(pkt);
		expect(result instanceof type.errors).toBe(false);
	});

	it('validates a room_event packet', () => {
		const pkt = {
			op: 'room_event',
			data: {
				type: 'add',
				room: { id: 'r1', name: 'New', hostId: 'u1', hostName: 'host' }
			}
		};
		const result = ServerPacketSchema(pkt);
		expect(result instanceof type.errors).toBe(false);
	});

	it('validates a room_state packet', () => {
		const pkt = {
			op: 'room_state',
			data: {
				id: 'r1',
				hostId: 'u1',
				players: [{ userId: 'u1', username: 'host' }]
			}
		};
		const result = ServerPacketSchema(pkt);
		expect(result instanceof type.errors).toBe(false);
	});

	it('validates a peer_score_update packet', () => {
		const pkt = {
			op: 'peer_score_update',
			data: {
				userId: 'u123',
				username: 'peppy',
				score: 500000,
				combo: 100
			}
		};
		const result = ServerPacketSchema(pkt);
		expect(result instanceof type.errors).toBe(false);
	});

	it('rejects peer_score_update missing userId', () => {
		const pkt = {
			op: 'peer_score_update',
			data: {
				username: 'peppy',
				score: 500000
			}
		};
		const result = ServerPacketSchema(pkt);
		expect(result instanceof type.errors).toBe(true);
	});

	it('rejects invalid packets', () => {
		expect(ClientPacketSchema(null) instanceof type.errors).toBe(true);
		expect(ClientPacketSchema({}) instanceof type.errors).toBe(true);
		expect(ServerPacketSchema({ op: 'invalid' }) instanceof type.errors).toBe(true);
	});
});
