import { db, user as userSchema } from '@mug/db';
import { type } from 'arktype';
import { eq } from 'drizzle-orm';
import { routerBaseContext } from './context';

export const CheckUsernameInput = type({
	username: 'string>0' // Non-empty string
});

export const checkUsernameProcedure = routerBaseContext
	.input(CheckUsernameInput)
	.handler(async ({ input }) => {
		try {
			const users = await db
				.select({ id: userSchema.id })
				.from(userSchema)
				.where(eq(userSchema.username, input.username.toLowerCase()))
				.limit(1)
				.execute();

			if (users[0]) {
				return { available: false, message: 'Username is already taken.' };
			}
			return { available: true, message: 'Username is available.' };
		} catch (e: unknown) {
			console.error('Error checking username:', e);
			throw new Error(
				e instanceof Error ? e.message : 'An error occurred while checking username availability.'
			);
		}
	});
