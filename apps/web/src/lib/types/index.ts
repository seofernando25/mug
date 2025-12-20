// src/lib/types/index.ts

// Database schema inferred types
import type {
	Song,
	NewSong,
	Chart,
	NewChart,
	ChartHitObject,
	NewChartHitObject,
	Score,
	NewScore,
	User,
	NewUser,
	Session,
	NewSession,
	Account,
	NewAccount,
	Verification,
	NewVerification
} from '@mug/db';
import type { orpcClient } from '$lib/rpc/client';

export type {
	Song,
	NewSong,
	Chart,
	NewChart,
	ChartHitObject,
	NewChartHitObject,
	Score,
	NewScore,
	User,
	NewUser,
	Session,
	NewSession,
	Account,
	NewAccount,
	Verification,
	NewVerification
};

// Chart representation for client, including hit objects
export type ClientSong = Awaited<ReturnType<typeof orpcClient.song.get>>;
export type ClientChart = ClientSong extends { charts: (infer T)[] }
	? T
	: ClientSong extends { charts: readonly (infer T)[] }
		? T
		: never;

// Re-export other specific type modules
export * from './game';
