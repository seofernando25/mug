import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;

function getDbInstance() {
	if (!_db) {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL is not set");
		}
		// TODO: configure per-service pool sizes; default small to protect web.
		_db = drizzle(process.env.DATABASE_URL, { schema });
	}
	return _db;
}

// Lazy getter - only initializes when accessed
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(_target, prop) {
		const instance = getDbInstance();
		const value = instance[prop as keyof typeof instance];
		// Bind methods to the instance to preserve 'this' context
		if (typeof value === "function") {
			return value.bind(instance);
		}
		return value;
	},
});

export function getDb() {
	return getDbInstance();
}
