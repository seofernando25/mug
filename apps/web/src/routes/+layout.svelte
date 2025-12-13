<script lang="ts">
import { authClient } from "$lib/auth-client";
import "../app.css";

const { children } = $props();

// Use client-side session store, but it will be initialized with server data
// This keeps the session reactive across the app
authClient.useSession();
</script>

<div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-mono">
	{@render children()}
</div>