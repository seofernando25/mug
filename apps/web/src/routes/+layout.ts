import { authClient } from '$lib/auth-client';

export const ssr = false;

export const load = async () => {
	const session = await authClient.getSession();
	return {
		session: session.data
	};
};
