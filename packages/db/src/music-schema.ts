import { relations } from "drizzle-orm";
import { integer, jsonb, pgEnum, pgTable, real, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const song = pgTable('song', {
	id: uuid('id').defaultRandom().primaryKey(),
	title: text('title').notNull(),
	artist: text('artist').notNull(),
	bpm: real('bpm').notNull(), // Initial BPM from metadata
	previewStartTime: integer('preview_start_time').default(0).notNull(), // ms
	audioFilename: text('audio_filename').notNull(), // Original filename
	audioS3Key: text('audio_s3_key').notNull(), // S3 key (path) to the audio file
	imageS3Key: text('image_s3_key'), // S3 key (path) to the cover image
	uploaderId: text('uploader_id').notNull().references(() => user.id, { onDelete: 'set null' }), // Link to the user who uploaded
	uploadDate: timestamp('upload_date').defaultNow().notNull(),
});

export const chart = pgTable('chart', {
	id: uuid('id').defaultRandom().primaryKey(),
	songId: uuid('song_id').notNull().references(() => song.id, { onDelete: 'cascade' }), // Link to the song
	difficultyName: text('difficulty_name').notNull(), // e.g., "Basic"
	lanes: integer('lanes').notNull(), // Number of lanes for this chart
	noteScrollSpeed: real('note_scroll_speed').default(1.0).notNull(), // Visual scroll speed multiplier
	lyrics: jsonb('lyrics'), // JSON array of { time: number, text: string } (Optional, still JSONB)
	// Removed: hitObjects field
});

// New table for individual hit objects belonging to a chart

export const noteTypePgEnum = pgEnum('note_type', ['tap', 'hold']);

export const chartHitObject = pgTable('chart_hit_object', { // Using snake_case for table name common in SQL, adjust if you prefer camelCase
	id: serial('id').primaryKey(), // Simple auto-incrementing ID for each hit object
	chartId: uuid('chart_id').notNull().references(() => chart.id, { onDelete: 'cascade' }), // Link to the chart this object belongs to
	time: integer('time').notNull(), // Hit time in milliseconds
	lane: integer('lane').notNull(), // Lane number (0-indexed)
	note_type: noteTypePgEnum('note_type').notNull(),
	duration: integer('duration'), // Duration in milliseconds (only for 'hold' type)
	// Add any other hit object properties needed later (e.g., custom sound, position)
});

// Table for storing player scores on charts
export const score = pgTable('score', {
	id: uuid('id').defaultRandom().primaryKey(),
	chartId: uuid('chart_id').notNull().references(() => chart.id, { onDelete: 'cascade' }), // Link to the chart
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), // Link to the user who got the score
	score: integer('score').notNull(),
	accuracy: real('accuracy').notNull(), // e.g., 98.5 -> stored as 98.5
	maxCombo: integer('max_combo').notNull(),
	playDate: timestamp('play_date').defaultNow().notNull(),
});


export const songRelations = relations(song, ({ many }) => ({
	charts: many(chart),
}));

export const chartRelations = relations(chart, ({ one, many }) => ({
	song: one(song, {
		fields: [chart.songId],
		references: [song.id]
	}), // Relation back to song (optional for this query but good practice)
	hitObjects: many(chartHitObject),
}));

export const chartHitObjectRelations = relations(chartHitObject, ({ one }) => ({
	chart: one(chart, {
		fields: [chartHitObject.chartId],
		references: [chart.id]
	}), // Relation back to chart (optional)
}));