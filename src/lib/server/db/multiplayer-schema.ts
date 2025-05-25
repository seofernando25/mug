import { pgTable, text, timestamp, serial, integer, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema'; // Assuming users table is exported as 'user'
import { chart } from './music-schema'; // Import chart table
import { relations } from 'drizzle-orm';

export const room = pgTable('room', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	passwordHash: text('password_hash'), // Nullable for public rooms
	ownerId: text('owner_id').references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }), // If owner's user account is deleted, set owner to NULL.
	createdAt: timestamp('created_at').defaultNow().notNull(),
	lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),

	// Reference to the currently selected chart for the room
	currentChartId: uuid('current_chart_id').references(() => chart.id, { onDelete: 'set null' }), // Nullable, if no chart is selected or chart is deleted
});

export const roomPlayer = pgTable('room_player', {
	roomId: integer('room_id').notNull().references(() => room.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => [
	primaryKey({ columns: [table.roomId, table.userId] }),
]);


// Room relations


export const roomRelations = relations(room, ({ one, many }) => ({
	currentChart: one(chart, {
		fields: [room.currentChartId],
		references: [chart.id],
	}),
	players: many(roomPlayer)
}));

export const roomPlayerRelations = relations(roomPlayer, ({ one }) => ({
	room: one(room, {
		fields: [roomPlayer.roomId],
		references: [room.id],
	}),
	user: one(user, {
		fields: [roomPlayer.userId],
		references: [user.id],
	}),
}));