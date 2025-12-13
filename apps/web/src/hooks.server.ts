import { auth } from "$lib/server/auth";
import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";

export const handle: Handle = async ({ event, resolve }) => {
	// Ignore Chrome DevTools specific request
	if (
		event.url.pathname === "/.well-known/appspecific/com.chrome.devtools.json"
	) {
		return new Response(null, { status: 200 });
	}

	return svelteKitHandler({
		event: event,
		resolve: resolve,
		auth,
		building,
	});
};
