import { describe, expect, it } from "bun:test";
import { assertClientPacket } from "./packets";

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
});

