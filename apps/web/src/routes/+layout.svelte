<script lang="ts">
import { authClient } from "$lib/auth-client";
import { goto } from "$app/navigation";
import { page } from "$app/stores";
import "../app.css";

const { children } = $props();

// Use client-side session store
const session = authClient.useSession();

// Client-side authentication and redirect logic
$effect(() => {
	const currentPath = $page.url.pathname;
	const sessionData = $session;
	const isPublicPage =
		currentPath === "/" ||
		currentPath === "/login" ||
		currentPath === "/register" ||
		currentPath === "/claim-username" ||
		currentPath.startsWith("/about");

	// If user is logged in but on a public page, redirect to app dashboard
	if (sessionData?.data?.session && isPublicPage) {
		goto("/home", { replaceState: true });
	}
});
</script>

<div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-mono">
	{@render children()}
</div>