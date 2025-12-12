import { describe, expect, it } from "bun:test";
import { assertClientPacket, assertServerPacket } from "./packets";

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

	it("rejects score_update with invalid data", () => {
		const payload = { op: "score_update", data: { score: "invalid" } };
		expect(() => assertClientPacket(payload)).toThrow(/numeric score/);
	});

	it("validates a room_list packet", () => {
		const pkt = {
			op: "room_list",
			data: [
				{ id: "r1", name: "Room", playerCount: 2, status: "idle" }
			]
		};
		expect(() => assertServerPacket(pkt)).not.toThrow();
	});

	it("validates a room_event packet", () => {
		const pkt = {
			op: "room_event",
			data: { type: "add", room: { id: "r1", name: "New", hostId: "u1", hostName: "host" } }
		};
		expect(() => assertServerPacket(pkt)).not.toThrow();
	});

	it("validates a room_state packet", () => {
		const pkt = {
			op: "room_state",
			data: { id: "r1", hostId: "u1", players: [{ userId: "u1", username: "host" }] }
		};
		expect(() => assertServerPacket(pkt)).not.toThrow();
	});

	it("validates a peer_score_update packet", () => {
		const pkt = {
			op: "peer_score_update",
			data: {
				userId: "u123",
				username: "peppy",
				score: 500000,
				combo: 100
			}
		};
		expect(() => assertServerPacket(pkt)).not.toThrow();
	});

	it("rejects peer_score_update missing userId", () => {
		const pkt = {
			op: "peer_score_update",
			data: {
				username: "peppy",
				score: 500000
			}
		};
		expect(() => assertServerPacket(pkt)).toThrow(/userId/);
	});

	it("rejects invalid packets", () => {
		expect(() => assertClientPacket(null)).toThrow();
		expect(() => assertClientPacket({})).toThrow();
		expect(() => assertServerPacket({ op: "invalid" })).toThrow(/Unsupported/);
	});
});

