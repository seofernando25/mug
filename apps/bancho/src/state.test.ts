import { describe, expect, it, mock } from "bun:test";
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
		expect(manager.getLobbyList().find(r => r.id === room.id)).toBeUndefined();
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
		expect(state?.players.find(p => p.userId === "u1")).toBeDefined();
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
});

