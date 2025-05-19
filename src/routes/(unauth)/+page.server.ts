import { redirect } from '@sveltejs/kit';

export async function load(event) {

	const data = await event.parent();

	if (data.session !== null) {
		redirect(302, '/express');
	}
} 