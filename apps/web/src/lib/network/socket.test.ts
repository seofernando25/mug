import { describe, it, expect, beforeEach, beforeAll, mock } from "bun:test";

// Dynamic imports after mocks are set up
let gameSocket: any;
let lobbyRooms: any;
let currentRoomState: any;
let matchState: any;

describe("gameSocket handler", () => {
	beforeAll(async () => {
		// Mock svelte/store before importing socket
		mock.module("svelte/store", () => ({
			writable: mock((initial: any) => {
				let value = initial;
				const subscribers = new Set<Function>();

				return {
					subscribe: mock((fn: Function) => {
						subscribers.add(fn);
						fn(value);
						return mock(() => subscribers.delete(fn));
					}),
					set: mock((newValue: any) => {
						value = newValue;
						subscribers.forEach((fn) => fn(value));
					}),
					update: mock((updater: Function) => {
						value = updater(value);
						subscribers.forEach((fn) => fn(value));
					}),
				};
			}),
			get: mock((store: any) => {
				let value;
				const unsub = store.subscribe((v: any) => (value = v));
				unsub();
				return value;
			}),
		}));

		// Import after mocking
		const socket = await import("./socket");
		gameSocket = socket.gameSocket;
		lobbyRooms = socket.lobbyRooms;
		currentRoomState = socket.currentRoomState;
		matchState = socket.matchState;
	});

	const clearStores = () => {
		lobbyRooms.set([]);
		currentRoomState.set(null);
		matchState.set({});
	};

	beforeEach(() => {
		clearStores();
	});

	it("updates lobbyRooms from room_list", () => {
		gameSocket.handleValidatedPacket({
			op: "room_list",
			data: [{ id: "r1", name: "Test", hostName: "host", playerCount: 1 }],
		});
		let rooms: any[] = [];
		const unsub = lobbyRooms.subscribe((v: any) => (rooms = v));
		unsub();
		expect(rooms.length).toBe(1);
		expect(rooms[0].name).toBe("Test");
		expect(rooms[0].hostName).toBe("host");
	});

	it("applies room_event add/remove", () => {
		lobbyRooms.set([{ id: "r1", name: "Old" } as any]);
		gameSocket.handleValidatedPacket({
			op: "room_event",
			data: { type: "add", room: { id: "r2", name: "New", hostName: "h" } },
		});
		let rooms: any[] = [];
		const unsub = lobbyRooms.subscribe((v: any) => (rooms = v));
		unsub();
		expect(rooms.find((r) => r.id === "r2")?.name).toBe("New");

		(gameSocket as any).handleValidatedPacket({
			op: "room_event",
			data: { type: "remove", room: { id: "r1" } },
		});
		const unsub2 = lobbyRooms.subscribe((v: any) => (rooms = v));
		unsub2();
		expect(rooms.find((r) => r.id === "r1")).toBeUndefined();
	});

	it("updates currentRoomState from room_state", () => {
		gameSocket.handleValidatedPacket({
			op: "room_state",
			data: {
				id: "r1",
				name: "Room",
				hostId: "u1",
				players: [{ userId: "u1", username: "host" }],
			},
		});
		let state: any = null;
		const unsub = currentRoomState.subscribe((v: any) => (state = v));
		unsub();
		expect(state?.id).toBe("r1");
		expect(state?.players[0].username).toBe("host");
	});

	it("handles valid peer_score_update", () => {
		matchState.set({});
		gameSocket.handleValidatedPacket({
			op: "peer_score_update",
			data: { userId: "user123", score: 1000, combo: 5 },
		});
		let state: any = null;
		const unsub = matchState.subscribe((v: any) => (state = v));
		unsub();
		expect(Object.keys(state).length).toBe(1);
		expect(state.user123.score).toBe(1000);
		expect(state.user123.combo).toBe(5);
	});

	it("queues messages when socket not connected", () => {
		// Create a mock socket that's not connected
		const mockSocket = {
			readyState: WebSocket.CONNECTING,
			send: (() => {
				throw new Error("Should not be called");
			}) as any,
		} as any;

		// Temporarily replace the internal ws
		const originalWs = (gameSocket as any).ws;
		(gameSocket as any).ws = mockSocket;

		try {
			// Send a message while "connecting"
			gameSocket.send("ping");

			// Check that the message was queued
			expect((gameSocket as any).messageQueue.length).toBe(1);
			expect((gameSocket as any).messageQueue[0].op).toBe("ping");

			// Verify send was not called on the socket
			// (message should be queued instead)
		} finally {
			// Restore original socket
			(gameSocket as any).ws = originalWs;
		}
	});
});
