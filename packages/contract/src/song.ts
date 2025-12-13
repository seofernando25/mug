import { type } from "arktype";

export const songSummarySchema = type({
	id: "string>0",
	title: "string>0",
	artist: "string>0",
	bpm: "number>0",
	imageUrl: "string?",
});

export type SongSummary = typeof songSummarySchema.infer;
