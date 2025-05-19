import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { username, anonymous } from "better-auth/plugins"

import * as schema from "./db/schema";

// Helper function to generate random alphanumeric characters
const generateRandomString = (length: number): string => {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
};

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			...schema,
		},
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
			generateName: () => `guest-${generateRandomString(5)}`
		})
	],
	emailAndPassword: {
		enabled: true,
	}
});
