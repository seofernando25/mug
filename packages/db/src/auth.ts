import { eq, or } from 'drizzle-orm';
import { db } from './client';
import { session, user } from './schema/auth';

export async function validateSession(token: string) {
	const result = await db
		.select({
			user: user,
			session: session
		})
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(
			or(
				eq(session.token, token), // primary
				eq(session.id, token) // fallback: some envs may store session id in the cookie
			)
		)
		.limit(1);

	if (result.length < 1) return null;

	const { session: s, user: u } = result[0];

	if (s.expiresAt < new Date()) {
		return null;
	}

	return { session: s, user: u };
}
