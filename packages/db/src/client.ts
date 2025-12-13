import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

// TODO: configure per-service pool sizes; default small to protect web.
export const db = drizzle(process.env.DATABASE_URL, { schema });

export function getDb() {
	return db;
}
