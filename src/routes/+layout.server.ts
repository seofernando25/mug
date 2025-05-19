import { auth } from '$lib/server/auth';

export const load = async (event) => {
	const session = await auth.api.getSession({
		headers: event.request.headers,
	});

	return {
		session
	};
}; 