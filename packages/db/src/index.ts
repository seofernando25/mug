import { drizzle } from 'drizzle-orm/bun-sql';
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username, anonymous } from "better-auth/plugins"
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}
export const db = drizzle(process.env.DATABASE_URL, { schema });

export { schema };

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema
	}),
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // Cache duration in seconds
		},
	},
	plugins: [
		username(),
		anonymous({
			generateName: () => `GUEST-${Math.random().toString(36).substring(2, 7)}`
		})
	],
	emailAndPassword: {
		enabled: true,
	}
});