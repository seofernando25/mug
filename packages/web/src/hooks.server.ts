
import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { auth } from "db/src";

export const handle: Handle = async ({ event, resolve }) => {
	// Ignore Chrome DevTools specific request
	if (event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
		return new Response(null, { status: 200 });
	}

	event.locals.session = await auth.api.getSession({
		headers: event.request.headers,
	});;


	return svelteKitHandler({ event, resolve, auth });
};