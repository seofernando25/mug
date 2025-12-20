import { type } from 'arktype';
import type { chart, chartHitObject } from '../../db/src/schema/music'; // Import Drizzle schema types

export const songSummarySchema = type({
	id: 'string>0',
	title: 'string>0',
	artist: 'string>0',
	bpm: 'number>0',
	imageUrl: 'string?'
});

export type SongSummary = typeof songSummarySchema.infer;

// Define ChartMetadata type from the Drizzle schema
export type ChartMetadata = typeof chart.$inferSelect;

// Define ClientChart type which includes chart metadata and its hit objects
export type ClientChart = ChartMetadata & {
	hitObjects: Array<typeof chartHitObject.$inferSelect>;
};

// Re-export ChartHitObject for convenience from @mug/contract
export type ChartHitObject = typeof chartHitObject.$inferSelect;
