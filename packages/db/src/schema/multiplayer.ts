import {
	pgTable,
	text,
	timestamp,
	serial,
	integer,
	primaryKey,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { chart } from "./music";
import { type InferSelectModel, type InferInsertModel, relations } from "drizzle-orm";

export const room = pgTable("room", {
	id: serial("id").primaryKey(),
	name: text("name").notNull().unique(),
	passwordHash: text("password_hash"),
	ownerId: text("owner_id").references(() => user.id, {
		onDelete: "set null",
		onUpdate: "cascade",
	}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
	currentChartId: uuid("current_chart_id").references(() => chart.id, {
		onDelete: "set null",
	}),
});

export type Room = InferSelectModel<typeof room>;
export type NewRoom = InferInsertModel<typeof room>;

export const roomPlayer = pgTable(
	"room_player",
	{
		roomId: integer("room_id")
			.notNull()
			.references(() => room.id, { onDelete: "cascade", onUpdate: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
		joinedAt: timestamp("joined_at").defaultNow().notNull(),
	},
	(table) => [primaryKey({ columns: [table.roomId, table.userId] })],
);

export type RoomPlayer = InferSelectModel<typeof roomPlayer>;
export type NewRoomPlayer = InferInsertModel<typeof roomPlayer>;

export const roomRelations = relations(room, (helpers) => ({
	currentChart: helpers.one(chart, {
		fields: [room.currentChartId],
		references: [chart.id],
	}),
	players: helpers.many(roomPlayer),
}));

export const roomPlayerRelations = relations(roomPlayer, (helpers) => ({
	room: helpers.one(room, {
		fields: [roomPlayer.roomId],
		references: [room.id],
	}),
	user: helpers.one(user, {
		fields: [roomPlayer.userId],
		references: [user.id],
	}),
}));
