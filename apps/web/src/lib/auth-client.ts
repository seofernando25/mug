import { createAuthClient } from "better-auth/svelte";
import { anonymousClient, usernameClient } from "better-auth/client/plugins"


export const authClient = createAuthClient({
	plugins: [
		usernameClient(),
		anonymousClient()
	]
});

