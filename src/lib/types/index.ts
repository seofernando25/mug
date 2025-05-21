// src/lib/types/index.ts

// Database schema inferred types

// From music-schema.ts
import type { chart, chartHitObject, score, song } from "$lib/server/db/music-schema";

export type Song = typeof song.$inferSelect;
export type NewSong = typeof song.$inferInsert;

export type Chart = typeof chart.$inferSelect;
export type NewChart = typeof chart.$inferInsert;

export type ChartHitObject = typeof chartHitObject.$inferSelect
export type NewChartHitObject = typeof chartHitObject.$inferInsert;

export type Score = typeof score.$inferSelect;
export type NewScore = typeof score.$inferInsert;

// From auth-schema.ts
import type { account, session, user, verification } from "$lib/server/db/auth-schema";
import type { orpcClient } from "$lib/rpc/client";

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;


// Chart representation for client, including hit objects
export type ClientSong = Awaited<ReturnType<typeof orpcClient.song.get>>
export type ClientChart = ClientSong['charts'][0]



// Re-export other specific type modules
export * from './game';

