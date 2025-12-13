import { describe, expect, it, mock, jest } from "bun:test";
import { RoomManager, type PlayerData } from "./state";
import type { ServerWebSocket } from "bun";

const createMockPlayer = (id: string, username: string) => {
	return {
		data: { user: { id, username }, roomId: undefined },
		send: mock(() => {}),
	} as unknown as ServerWebSocket<PlayerData>;
};

describe("RoomManager Logic", () => {
	it("creates a room and triggers notifier", () => {
		const notifier = mock(() => {});
		const manager = new RoomManager(notifier);
		const host = createMockPlayer("u1", "peppy");
		const room = manager.createRoom(host, "Test Room");

		expect(room.name).toBe("Test Room");
		expect(room.players.has(host)).toBe(true);
		expect(host.data.roomId).toBe(room.id);
		expect(notifier).toHaveBeenCalled();
		const event = notifier.mock.calls[0][0] as any;
		expect(event.type).toBe("add");
		expect(event.room.id).toBe(room.id);
	});

	it("broadcasts to host when a second player joins", () => {
		const manager = new RoomManager();
		const host = createMockPlayer("u1", "host");
		const p2 = createMockPlayer("u2", "joiner");
		const room = manager.createRoom(host, "Multiplayer");
		manager.joinRoom(p2, room.id);
		expect(room.players.size).toBe(2);
		expect((host.send as any).mock.calls.length).toBeGreaterThan(0);
		const sent = JSON.parse((host.send as any).mock.calls[0][0]);
		expect(sent.op).toBe("room_event");
	});

	it("removes room when last player leaves", () => {
		const notifier = mock(() => {});
		const manager = new RoomManager(notifier);
		const host = createMockPlayer("u1", "host");
		const room = manager.createRoom(host, "Temp");
		manager.leaveRoom(host);
		expect(
			manager.getLobbyList().find((r) => r.id === room.id),
		).toBeUndefined();
		expect(notifier).toHaveBeenCalledTimes(2); // add + remove
	});

	it("includes hostName and hostId in lobby list and room state", () => {
		const manager = new RoomManager();
		const host = createMockPlayer("u1", "peppy");
		const room = manager.createRoom(host, "Lobby");
		const lobby = manager.getLobbyList()[0];
		expect(lobby.hostId).toBe("u1");
		expect(lobby.hostName).toBe("peppy");

		const state = manager.getRoomState(room.id);
		expect(state?.hostId).toBe("u1");
		expect(state?.hostName).toBe("peppy");
		expect(state?.players.find((p) => p.userId === "u1")).toBeDefined();
	});

	it("reassigns host and updates hostName when original host leaves", () => {
		const manager = new RoomManager();
		const host = createMockPlayer("u1", "first");
		const p2 = createMockPlayer("u2", "second");
		const room = manager.createRoom(host, "Lobby");
		manager.joinRoom(p2, room.id);
		manager.leaveRoom(host);
		const state = manager.getRoomState(room.id);
		expect(state?.hostId).toBe("u2");
		expect(state?.hostName).toBe("second");
	});

	it("allows reconnection within 5-second grace period", () => {
		// Create mock timer functions
		let timeoutCallback: (() => void) | null = null;
		let timeoutId = 1;

		const mockSetTimeout = (callback: () => void, delay: number) => {
			timeoutCallback = callback;
			return timeoutId++ as any;
		};

		const mockClearTimeout = (id: number) => {
			if (timeoutCallback) {
				timeoutCallback = null;
			}
		};

		const manager = new RoomManager(() => {}, mockSetTimeout, mockClearTimeout);
		const player = createMockPlayer("u1", "test");
		const room = manager.createRoom(player, "Test Room");

		// Simulate disconnect
		manager.handleDisconnect(player);

		// Room should still exist immediately after disconnect
		expect(manager.getLobbyList().find((r) => r.id === room.id)).toBeDefined();
		expect(room.players.has(player)).toBe(true);

		// Timer should be set but not fired yet
		expect(timeoutCallback).toBeTruthy();

		// Create new socket for reconnection (simulating page refresh) BEFORE timer fires
		const newSocket = createMockPlayer("u1", "test");

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

	it("actually disconnects after 5-second grace period", () => {
		// Create mock timer functions
		let timeoutCallback: (() => void) | null = null;
		let timeoutId = 1;

		const mockSetTimeout = (callback: () => void, delay: number) => {
			timeoutCallback = callback;
			return timeoutId++;
		};

		const mockClearTimeout = (id: number) => {
			timeoutCallback = null;
		};

		const notifier = mock(() => {});
		const manager = new RoomManager(notifier, mockSetTimeout, mockClearTimeout);
		const player = createMockPlayer("u1", "test");
		const room = manager.createRoom(player, "Test Room");

		// Simulate disconnect
		manager.handleDisconnect(player);

		// Room should still exist immediately after disconnect
		expect(manager.getLobbyList().find((r) => r.id === room.id)).toBeDefined();

		// Simulate timer firing (5 seconds passed)
		expect(timeoutCallback).toBeTruthy();
		timeoutCallback!(); // Fire the disconnect timer

		// Room should be deleted automatically
		expect(
			manager.getLobbyList().find((r) => r.id === room.id),
		).toBeUndefined();
		expect(notifier).toHaveBeenCalledTimes(2); // add + remove

		// Trying to join should fail
		const newSocket = createMockPlayer("u1", "test");
		expect(() => manager.joinRoom(newSocket, room.id)).toThrow(
			"Room not found",
		);
	});
});
