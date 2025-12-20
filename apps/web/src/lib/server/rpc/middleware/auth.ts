import { auth } from '$lib/server/auth';
import { ORPCError } from '@orpc/server';
import { routerBaseContext } from '../context';

export const requireAuth = routerBaseContext.middleware(async ({ context, next }) => {
	let sessionPayload: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
	try {
		sessionPayload = await auth.api.getSession({
			headers: context.headers
		});
	} catch (error) {
		console.error('getSession error:', error);
		throw new ORPCError('UNAUTHORIZED');
	}

	if (sessionPayload?.user.isAnonymous || sessionPayload === null || sessionPayload.user === null) {
		throw new ORPCError('UNAUTHORIZED');
	}

	return next({
		context: {
			...context,
			auth: sessionPayload
		}
	});
});
