import { describe, expect, it, beforeAll } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import JSZip from "jszip";
import { processFileAndExtractData } from "./parsing";

describe("Chart Parser", () => {
	it("rejects invalid file extension", async () => {
		const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "application/octet-stream" });
		await expect(processFileAndExtractData(blob)).rejects.toThrow();
	});

	describe("OSZ File Processing", () => {
		let testData: any = null;

		beforeAll(async () => {
			// Load the test .osz file
			const testFilePath = join(__dirname, '..', 'test-song.osz');
			const fileBuffer = readFileSync(testFilePath);
			const file = new File([fileBuffer], 'test-song.osz', { type: 'application/octet-stream' });

			testData = await processFileAndExtractData(file);
		});

		it("successfully processes the test .osz file", () => {
			expect(testData).toBeDefined();
			expect(testData.metadata).toBeDefined();
			expect(testData.charts).toBeDefined();
			expect(testData.hitObjects).toBeDefined();
			expect(testData.audioContent).toBeDefined();
		});

		it("extracts correct metadata", () => {
			expect(testData.metadata.title).toBe("Bad Piggies Theme");
			expect(testData.metadata.artist).toBe("Ilmari Hakkola");
			expect(testData.metadata.audioFilename).toBe("audio 1.154x (pitch raised).mp3");
			expect(typeof testData.metadata.bpm).toBe("number");
			expect(testData.metadata.bpm).toBeGreaterThan(0);
		});

		it("parses charts correctly", () => {
			expect(Array.isArray(testData.charts)).toBe(true);
			expect(testData.charts.length).toBeGreaterThan(0);

			// Check first chart structure
			const firstChart = testData.charts[0];
			expect(firstChart).toHaveProperty("difficultyName");
			expect(firstChart).toHaveProperty("lanes");
			expect(firstChart).toHaveProperty("noteScrollSpeed");
			expect(typeof firstChart.lanes).toBe("number");
			expect(firstChart.lanes).toBeGreaterThan(0);
		});

		it("parses hit objects correctly", () => {
			expect(Array.isArray(testData.hitObjects)).toBe(true);
			expect(testData.hitObjects.length).toBe(testData.charts.length);

			// Check that each chart has hit objects
			testData.hitObjects.forEach((chartHitObjects: any) => {
				expect(Array.isArray(chartHitObjects)).toBe(true);
				// Should have at least some notes
				expect(chartHitObjects.length).toBeGreaterThan(0);
			});

			// Check hit object structure
			const firstChartHitObjects = testData.hitObjects[0];
			const firstHitObject = firstChartHitObjects[0];
			expect(firstHitObject).toHaveProperty("time");
			expect(firstHitObject).toHaveProperty("lane");
			expect(firstHitObject).toHaveProperty("type");
			expect(typeof firstHitObject.time).toBe("number");
			expect(typeof firstHitObject.lane).toBe("number");
			expect(["tap", "hold"]).toContain(firstHitObject.type);
		});

		it("extracts audio content", () => {
			expect(testData.audioContent).toBeInstanceOf(Uint8Array);
			expect(testData.audioContent.length).toBeGreaterThan(0);
		});

		it("handles image content appropriately", () => {
			// May or may not have image content
			if (testData.imageContent) {
				expect(testData.imageContent).toBeInstanceOf(Uint8Array);
			}
		});

		it("validates chart-hitobject correspondence", () => {
			// Each chart should have a corresponding hitObjects array
			expect(testData.charts.length).toBe(testData.hitObjects.length);

			testData.charts.forEach((chart: any, index: number) => {
				const hitObjects = testData.hitObjects[index];
				expect(Array.isArray(hitObjects)).toBe(true);

				// All hit objects should be within valid lane range
				hitObjects.forEach((hitObject: any) => {
					expect(hitObject.lane).toBeGreaterThanOrEqual(0);
					expect(hitObject.lane).toBeLessThan(chart.lanes);
				});
			});
		});

		it("ensures chronological hit object ordering", () => {
			testData.hitObjects.forEach((chartHitObjects: any[]) => {
				for (let i = 1; i < chartHitObjects.length; i++) {
					expect(chartHitObjects[i].time).toBeGreaterThanOrEqual(chartHitObjects[i - 1].time);
				}
			});
		});

		it("validates hit object types and properties", () => {
			testData.hitObjects.forEach((chartHitObjects: any[]) => {
				chartHitObjects.forEach((hitObject: any) => {
					// Validate required properties
					expect(hitObject).toHaveProperty("time");
					expect(hitObject).toHaveProperty("lane");
					expect(hitObject).toHaveProperty("type");

					// Validate types
					expect(typeof hitObject.time).toBe("number");
					expect(typeof hitObject.lane).toBe("number");
					expect(["tap", "hold"]).toContain(hitObject.type);

					// Validate hold notes have duration
					if (hitObject.type === "hold") {
						expect(hitObject).toHaveProperty("duration");
						expect(typeof hitObject.duration).toBe("number");
						expect(hitObject.duration).toBeGreaterThan(0);
					}
				});
			});
		});

		it("validates chart metadata", () => {
			testData.charts.forEach((chart: any) => {
				expect(chart).toHaveProperty("difficultyName");
				expect(chart).toHaveProperty("lanes");
				expect(chart).toHaveProperty("noteScrollSpeed");

				expect(typeof chart.difficultyName).toBe("string");
				expect(typeof chart.lanes).toBe("number");
				expect(typeof chart.noteScrollSpeed).toBe("number");

				expect(chart.lanes).toBeGreaterThan(0);
				expect(chart.noteScrollSpeed).toBeGreaterThan(0);
			});
		});

		it("ensures audio file exists in processed data", () => {
			expect(testData.audioContent).toBeInstanceOf(Uint8Array);
			expect(testData.audioContent.length).toBeGreaterThan(1000); // Should be a substantial audio file
		});
	});

	describe("Error Handling", () => {
		it("rejects files without .osu files", async () => {
			// Create a zip file without .osu files
			const zip = new JSZip();
			zip.file("audio.mp3", "fake audio content");
			const zipBlob = await zip.generateAsync({ type: "blob" });
			const file = new File([zipBlob], "test.osz", { type: "application/octet-stream" });

			await expect(processFileAndExtractData(file)).rejects.toThrow("No .osu files found");
		});

		it("rejects files without audio", async () => {
			// Create a minimal .osz with .osu but no audio
			const zip = new JSZip();
			const osuContent = `[General]
AudioFilename: missing.mp3
[Metadata]
Title:Test Song
Artist:Test Artist
[Difficulty]
CircleSize:4
[TimingPoints]
0,500,4,1,0,100,1,0
[HitObjects]
0,0,0,1,0,0:0:0:0:
`;
			zip.file("test.osu", osuContent);
			const zipBlob = await zip.generateAsync({ type: "blob" });
			const file = new File([zipBlob], "test.osz", { type: "application/octet-stream" });

			await expect(processFileAndExtractData(file)).rejects.toThrow();
		});
	});
});

