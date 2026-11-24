import { eq, or } from 'drizzle-orm';
import { db } from './client';
import { session, user } from './schema/auth';

export async function validateSession(token: string) {
	// Debug logging for production troubleshooting
	console.log(`[db] Validating session token: ${token.slice(0, 8)}...`);
	
	const result = await db
		.select({
			user: user,
			session: session
		})
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(
			or(
				eq(session.token, token), // hashed token (default)
				eq(session.id, token)    // raw session id (fallback)
			)
		)
		.limit(1);

	if (result.length < 1) {
		console.log(`[db] Session not found for token: ${token.slice(0, 8)}...`);
		return null;
	}

	const { session: s, user: u } = result[0];

	if (s.expiresAt < new Date()) {
		console.log(`[db] Session expired for token: ${token.slice(0, 8)}...`);
		return null;
	}

	return { session: s, user: u };
}
