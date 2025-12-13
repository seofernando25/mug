import { auth } from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";

export const load = async (event) => {
	try {
		const session = await auth.api.getSession({
			headers: event.request.headers,
		});

		// Determine where the user is trying to go
		const path = event.url.pathname;
		const isPublicPage =
			path === "/" ||
			path === "/login" ||
			path === "/register" ||
			path === "/claim-username" ||
			path.startsWith("/about");

		// If user is logged in but on a public page, redirect to app dashboard
		if (session && isPublicPage) {
			throw redirect(302, "/express");
		}

		return {
			session,
		};
	} catch (error) {
		// If it's not a redirect error, log it and return null session
		if (
			!(error instanceof Response && error.status >= 300 && error.status < 400)
		) {
			console.error("Session loading error:", error);
		}
		return {
			session: null,
		};
	}
};
