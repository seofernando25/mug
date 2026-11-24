import { describe, expect, it, mock } from 'bun:test';
import { RoomManager, type LobbyNotifier, type PlayerData } from './state';
import type { ServerWebSocket } from 'bun';

const createMockPlayer = (id: string, username: string) => {
	return {
		data: { user: { id, username }, roomId: undefined },
		send: mock(() => {})
	} as unknown as ServerWebSocket<PlayerData>;
};

// Messages captured by a mock player's send().
const sentMessages = (player: ServerWebSocket<PlayerData>) =>
	(player as unknown as { send: { mock: { calls: [string][] } } }).send.mock.calls.map(
		([message]) => message
	);

describe('RoomManager Logic', () => {
	it('creates a room and triggers notifier', () => {
		const notifier = mock<LobbyNotifier>(() => {});
		const manager = new RoomManager(notifier);
		const host = createMockPlayer('u1', 'peppy');
		const room = manager.createRoom(host, 'Test Room');

		expect(room.name).toBe('Test Room');
		expect(room.players.has(host)).toBe(true);
		expect(host.data.roomId).toBe(room.id);
		expect(notifier).toHaveBeenCalled();
		const event = notifier.mock.calls[0][0] as { type: 'add'; room: { id: string; name: string } };
		expect(event.type).toBe('add');
		expect(event.room.id).toBe(room.id);
	});

	it('broadcasts to host when a second player joins', () => {
		const manager = new RoomManager();
		const host = createMockPlayer('u1', 'host');
		const p2 = createMockPlayer('u2', 'joiner');
		const room = manager.createRoom(host, 'Multiplayer');
		manager.joinRoom(p2, room.id);
		expect(room.players.size).toBe(2);
		const sentToHost = sentMessages(host);
		expect(sentToHost.length).toBeGreaterThan(0);
		const sent = JSON.parse(sentToHost[0]);
		expect(sent.op).toBe('room_event');
		expect(sent.data.type).toBe('join');
	});

	it('removes room when last player leaves', () => {
		const notifier = mock(() => {});
		const manager = new RoomManager(notifier);
		const host = createMockPlayer('u1', 'host');
		const room = manager.createRoom(host, 'Temp');
		manager.leaveRoom(host);
		expect(manager.getLobbyList().find((r) => r.id === room.id)).toBeUndefined();
		expect(notifier).toHaveBeenCalledTimes(2); // add + remove
	});

	it('includes hostName and hostId in lobby list and room state', () => {
		const manager = new RoomManager();
		const host = createMockPlayer('u1', 'peppy');
		const room = manager.createRoom(host, 'Lobby');
		const lobby = manager.getLobbyList()[0];
		expect(lobby.hostId).toBe('u1');
		expect(lobby.hostName).toBe('peppy');

		const state = manager.getRoomState(room.id);
		expect(state?.hostId).toBe('u1');
		expect(state?.hostName).toBe('peppy');
		expect(state?.players.find((p) => p.userId === 'u1')).toBeDefined();
	});

	it('reassigns host and updates hostName when original host leaves', () => {
		const manager = new RoomManager();
		const host = createMockPlayer('u1', 'first');
		const p2 = createMockPlayer('u2', 'second');
		const room = manager.createRoom(host, 'Lobby');
		manager.joinRoom(p2, room.id);
		manager.leaveRoom(host);
		const state = manager.getRoomState(room.id);
		expect(state?.hostId).toBe('u2');
		expect(state?.hostName).toBe('second');
	});

	it('allows reconnection within 5-second grace period', () => {
		// Create mock timer functions
		let timeoutCallback: (() => void) | null = null;
		let timeoutId = 1;

		const mockSetTimeout = (callback: () => void, _delay: number): Timer => {
			timeoutCallback = callback;
			return timeoutId++ as unknown as Timer;
		};

		const mockClearTimeout = (_id: Timer) => {
			if (timeoutCallback) {
				timeoutCallback = null;
			}
		};

		const manager = new RoomManager(() => {}, mockSetTimeout, mockClearTimeout);
		const player = createMockPlayer('u1', 'test');
		const room = manager.createRoom(player, 'Test Room');

		// Simulate disconnect
		manager.handleDisconnect(player);

		// Room should still exist immediately after disconnect
		expect(manager.getLobbyList().find((r) => r.id === room.id)).toBeDefined();
		expect(room.players.has(player)).toBe(true);

		// Timer should be set but not fired yet
		expect(timeoutCallback).toBeTruthy();

		// Create new socket for reconnection (simulating page refresh) BEFORE timer fires
		const newSocket = createMockPlayer('u1', 'test');

		// Reconnect should succeed and cancel the disconnect timer
		expect(() => manager.joinRoom(newSocket, room.id)).not.toThrow();

		// Room should still exist
		expect(manager.getLobbyList().find((r) => r.id === room.id)).toBeDefined();

		// Old socket should be gone, new socket should be in the room
		expect(room.players.has(player)).toBe(false);
		expect(room.players.has(newSocket)).toBe(true);
		expect(newSocket.data.roomId).toBe(room.id);

		// Timer should be cleared (callback nulled)
		expect(timeoutCallback).toBeNull();
	});

	it('actually disconnects after 5-second grace period', () => {
		// Create mock timer functions
		let timeoutCallback: (() => void) | null = null;
		let timeoutId = 1;

		const mockSetTimeout = (callback: () => void, _delay: number): Timer => {
			timeoutCallback = callback;
			return timeoutId++ as unknown as Timer;
		};

		const mockClearTimeout = (_id: Timer) => {
			timeoutCallback = null;
		};

		const notifier = mock(() => {});
		const manager = new RoomManager(notifier, mockSetTimeout, mockClearTimeout);
		const player = createMockPlayer('u1', 'test');
		const room = manager.createRoom(player, 'Test Room');

		// Simulate disconnect
		manager.handleDisconnect(player);

		// Room should still exist immediately after disconnect
		expect(manager.getLobbyList().find((r) => r.id === room.id)).toBeDefined();

		// Simulate timer firing (5 seconds passed)
		const pendingCallback = timeoutCallback as (() => void) | null;
		expect(pendingCallback).toBeTruthy();
		pendingCallback?.(); // Fire the disconnect timer

		// Room should be deleted automatically
		expect(manager.getLobbyList().find((r) => r.id === room.id)).toBeUndefined();
		expect(notifier).toHaveBeenCalledTimes(2); // add + remove

		// Trying to join should fail
		const newSocket = createMockPlayer('u1', 'test');
		expect(() => manager.joinRoom(newSocket, room.id)).toThrow('Room not found');
	});
});
