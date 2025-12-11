import { describe, expect, it } from "bun:test";
import { assertClientPacket, assertServerPacket } from "./packets";
import { wsRoomListSchema, wsRoomEventSchema, wsRoomStateSchema } from "./wsSchemas";

describe("Contract Integrity", () => {
	it("validates a correct join_room packet", () => {
		const payload = { op: "join_room", data: { roomId: "room-123" } };
		expect(() => assertClientPacket(payload)).not.toThrow();
	});

	it("rejects a malformed packet (missing roomId)", () => {
		const payload = { op: "join_room", data: {} };
		expect(() => assertClientPacket(payload)).toThrow(/roomId/);
	});

	it("validates score_update with numbers", () => {
		const payload = { op: "score_update", data: { score: 100000, combo: 50 } };
		expect(() => assertClientPacket(payload)).not.toThrow();
	});

	it("rejects score_update with strings", () => {
		const payload = { op: "score_update", data: { score: "100000", combo: 50 } } as any;
		expect(() => assertClientPacket(payload)).toThrow(/numeric score/);
	});

	it("validates a room_list packet shape with Arktype", () => {
		const pkt = {
			op: "room_list",
			data: [
				{ id: "r1", name: "Room", playerCount: 2, status: "idle", hostId: "u1", hostName: "host" }
			]
		};
		expect(() => wsRoomListSchema.assert(pkt)).not.toThrow();
		expect(() => assertServerPacket(pkt)).not.toThrow();
	});

	it("validates a room_event packet shape with Arktype", () => {
		const pkt = {
			op: "room_event",
			data: { type: "add", room: { id: "r1", name: "New", hostId: "u1", hostName: "host" } }
		};
		expect(() => wsRoomEventSchema.assert(pkt)).not.toThrow();
		expect(() => assertServerPacket(pkt)).not.toThrow();
	});

	it("validates a room_state packet shape with Arktype", () => {
		const pkt = {
			op: "room_state",
			data: { id: "r1", hostId: "u1", hostName: "host", players: [{ userId: "u1", username: "host" }] }
		};
		expect(() => wsRoomStateSchema.assert(pkt)).not.toThrow();
		expect(() => assertServerPacket(pkt)).not.toThrow();
	});
});

