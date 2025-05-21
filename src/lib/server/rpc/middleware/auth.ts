import { auth } from '$lib/server/auth';
import { ORPCError } from '@orpc/server';
import { routerBaseContext } from '../context';

export const requireAuth = routerBaseContext.middleware(async ({ context, next }) => {
	console.log('Context:', context);
	const sessionPayload = await auth.api.getSession({
		headers: context.headers,
	});

	if (sessionPayload?.user.isAnonymous
		|| sessionPayload === null
		|| sessionPayload.user === null) {
		throw new ORPCError('UNAUTHORIZED');
	}


	return next({
		context: {
			...context,
			auth: sessionPayload,
		}
	});
});