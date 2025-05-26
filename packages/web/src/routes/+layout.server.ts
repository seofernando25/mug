import { auth } from "db/src";

export const load = async (event) => {
	const session = await auth.api.getSession({
		headers: event.request.headers,
	});


	return {
		session
	};
}; 