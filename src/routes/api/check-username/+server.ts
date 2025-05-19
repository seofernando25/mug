import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const username = url.searchParams.get('username');

	if (!username) {
		return json({ error: 'Username parameter is required' }, { status: 400 });
	}

	try {
		const existingUser = await db.select().from(user).where(eq(user.username, username)).limit(1);
		return json({ exists: existingUser.length > 0 });
	} catch (error) {
		console.error('Error checking username:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}; 