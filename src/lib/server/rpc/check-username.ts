import { db } from '$lib/server/db';
import { user as userSchema } from '$lib/server/db/auth-schema';
import { type } from 'arktype';
import { eq } from 'drizzle-orm';
import { routerBaseContext } from './context';

export const CheckUsernameInput = type({
	username: 'string>0', // Non-empty string
});

export const checkUsernameProcedure = routerBaseContext
	.input(CheckUsernameInput)
	// Output will be inferred
	.handler(async ({ input }) => {
		try {
			const users = await db
				.select({ id: userSchema.id })
				.from(userSchema)
				.where(eq(userSchema.username, input.username.toLowerCase()))
				.limit(1)
				.execute();

			const existingUser = users[0];

			if (existingUser) {
				return { available: false, message: 'Username is already taken.' };
			}
			return { available: true, message: 'Username is available.' };
		} catch (e: any) {
			console.error('Error checking username:', e);
			// Throw an actual error for unexpected server issues
			throw new Error(e.message || 'An error occurred while checking username availability.');
		}
	}); 