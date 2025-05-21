import { redirect } from '@sveltejs/kit';

export const load = async (event) => {
	const data = await event.parent();

	if (data.session === null) {
		throw redirect(303, '/');
	}

	return {
		session: data.session
	};
}; 