<script lang="ts">
import { authClient } from "$lib/auth-client";
import { goto } from "$app/navigation";
import { page } from "$app/stores";

const { children } = $props();

// Use client-side session store
const session = authClient.useSession();

// Client-side authentication check for protected routes
$effect(() => {
	const sessionData = $session;
	
	// If user is not logged in, redirect to home
	if (!sessionData?.data?.session) {
		goto("/", { replaceState: true });
	}
});
</script>

{@render children()}

