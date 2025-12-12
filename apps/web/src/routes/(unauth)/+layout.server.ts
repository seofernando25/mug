import { redirect } from '@sveltejs/kit';

export const load = async (event) => {
	// Get parent data
	const data = await event.parent();

	if (data.session) {
		throw redirect(303, '/express');
	}

	return {};
};
