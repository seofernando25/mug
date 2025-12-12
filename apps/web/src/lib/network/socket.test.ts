import { describe, it, expect, beforeEach } from "bun:test";
import { gameSocket, lobbyRooms, currentRoomState, matchState } from "./socket";

const clearStores = () => {
	lobbyRooms.set([]);
	currentRoomState.set(null);
	matchState.set({});
};

describe("gameSocket handler", () => {
	beforeEach(() => {
		clearStores();
	});

	it("updates lobbyRooms from room_list", () => {
		(gameSocket as any).handlePacket({
			op: "room_list",
			data: [{ id: "r1", name: "Test", hostName: "host", playerCount: 1 }],
		});
		let rooms: any[] = [];
		const unsub = lobbyRooms.subscribe((v) => (rooms = v));
		unsub();
		expect(rooms.length).toBe(1);
		expect(rooms[0].name).toBe("Test");
		expect(rooms[0].hostName).toBe("host");
	});

	it("applies room_event add/remove", () => {
		lobbyRooms.set([{ id: "r1", name: "Old" } as any]);
		(gameSocket as any).handlePacket({
			op: "room_event",
			data: { type: "add", room: { id: "r2", name: "New", hostName: "h" } },
		});
		let rooms: any[] = [];
		const unsub = lobbyRooms.subscribe((v) => (rooms = v));
		unsub();
		expect(rooms.find((r) => r.id === "r2")?.name).toBe("New");

		(gameSocket as any).handlePacket({
			op: "room_event",
			data: { type: "remove", room: { id: "r1" } },
		});
		const unsub2 = lobbyRooms.subscribe((v) => (rooms = v));
		unsub2();
		expect(rooms.find((r) => r.id === "r1")).toBeUndefined();
	});

	it("updates currentRoomState from room_state", () => {
		(gameSocket as any).handlePacket({
			op: "room_state",
			data: {
				id: "r1",
				name: "Room",
				hostId: "u1",
				players: [{ userId: "u1", username: "host" }],
			},
		});
		let state: any = null;
		const unsub = currentRoomState.subscribe((v) => (state = v));
		unsub();
		expect(state?.id).toBe("r1");
		expect(state?.players[0].username).toBe("host");
	});

	it("ignores invalid peer_score_update", () => {
		matchState.set({});
		(gameSocket as any).handlePacket({
			op: "peer_score_update",
			data: { userId: 123, score: "not-number" },
		});
		let state: any = null;
		const unsub = matchState.subscribe((v) => (state = v));
		unsub();
		expect(Object.keys(state).length).toBe(0);
	});
});

