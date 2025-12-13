import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@mug/db";
import { username, anonymous } from "better-auth/plugins";

// Helper function to generate random alphanumeric characters
const generateRandomString = (length: number): string => {
	const characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
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
			generateName: () => `GUEST-${generateRandomString(5)}`,
		}),
	],
	emailAndPassword: {
		enabled: true,
	},
});
