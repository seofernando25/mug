import { auth } from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";

export const load = async (event) => {
	let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
	try {
		session = await auth.api.getSession({
			headers: event.request.headers,
		});
	} catch (error) {
		// Log actual errors and return null session
		console.error("Session loading error:", error);
		return {
			session: null,
		};
	}

	// Determine where the user is trying to go
	const path = event.url.pathname;
	const isPublicPage =
		path === "/" ||
		path === "/login" ||
		path === "/register" ||
		path === "/claim-username" ||
		path.startsWith("/about");

	// If user is logged in but on a public page, redirect to app dashboard
	// This must be outside try-catch as redirect() should not be used inside try-catch
	if (session && isPublicPage) {
		throw redirect(302, "/express");
	}

	return {
		session,
	};
};
