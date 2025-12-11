import { describe, expect, it } from "bun:test";
import { processFileAndExtractData } from "./parsing";

describe("Chart Parser", () => {
	it("rejects invalid file extension", async () => {
		const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "application/octet-stream" });
		await expect(processFileAndExtractData(blob)).rejects.toThrow();
	});
});

