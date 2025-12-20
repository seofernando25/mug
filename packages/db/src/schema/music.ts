import {
	integer,
	jsonb,
	pgEnum,
	pgTable,
	real,
	serial,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { type InferSelectModel, type InferInsertModel, relations } from 'drizzle-orm';

export const song = pgTable('song', {
	id: uuid('id').defaultRandom().primaryKey(),
	title: text('title').notNull(),
	artist: text('artist').notNull(),
	bpm: real('bpm').notNull(), // Initial BPM from metadata
	previewStartTime: integer('preview_start_time').default(0).notNull(), // ms
	audioFilename: text('audio_filename').notNull(), // Original filename
	audioS3Key: text('audio_s3_key').notNull(), // S3 key (path) to the audio file
	imageS3Key: text('image_s3_key'), // S3 key (path) to the cover image
	uploaderId: text('uploader_id')
		.notNull()
		.references(() => user.id, { onDelete: 'set null' }), // Link to the user who uploaded
	uploadDate: timestamp('upload_date').defaultNow().notNull()
});

export type Song = InferSelectModel<typeof song>;
export type NewSong = InferInsertModel<typeof song>;

export const chart = pgTable('chart', {
	id: uuid('id').defaultRandom().primaryKey(),
	songId: uuid('song_id')
		.notNull()
		.references(() => song.id, { onDelete: 'cascade' }), // Link to the song
	difficultyName: text('difficulty_name').notNull(), // e.g., "Basic"
	lanes: integer('lanes').notNull(), // Number of lanes for this chart
	noteScrollSpeed: real('note_scroll_speed').default(1.0).notNull(), // Visual scroll speed multiplier
	lyrics: jsonb('lyrics') // JSON array of { time: number, text: string } (Optional, still JSONB)
	// Removed: hitObjects field
});

export type Chart = InferSelectModel<typeof chart>;
export type NewChart = InferInsertModel<typeof chart>;

export const noteTypePgEnum = pgEnum('note_type', ['tap', 'hold']);

export const chartHitObject = pgTable('chart_hit_object', {
	id: serial('id').primaryKey(),
	chartId: uuid('chart_id')
		.notNull()
		.references(() => chart.id, { onDelete: 'cascade' }),
	time: integer('time').notNull(),
	lane: integer('lane').notNull(),
	note_type: noteTypePgEnum('note_type').notNull(),
	duration: integer('duration')
});

export type ChartHitObject = InferSelectModel<typeof chartHitObject>;
export type NewChartHitObject = InferInsertModel<typeof chartHitObject>;

export const score = pgTable('score', {
	id: uuid('id').defaultRandom().primaryKey(),
	chartId: uuid('chart_id')
		.notNull()
		.references(() => chart.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	score: integer('score').notNull(),
	accuracy: real('accuracy').notNull(),
	maxCombo: integer('max_combo').notNull(),
	playDate: timestamp('play_date').defaultNow().notNull()
});

export type Score = InferSelectModel<typeof score>;
export type NewScore = InferInsertModel<typeof score>;

export const songRelations = relations(song, (helpers) => ({
	charts: helpers.many(chart)
}));

export const chartRelations = relations(chart, (helpers) => ({
	song: helpers.one(song, {
		fields: [chart.songId],
		references: [song.id]
	}),
	hitObjects: helpers.many(chartHitObject)
}));

export const chartHitObjectRelations = relations(chartHitObject, (helpers) => ({
	chart: helpers.one(chart, {
		fields: [chartHitObject.chartId],
		references: [chart.id]
	})
}));
