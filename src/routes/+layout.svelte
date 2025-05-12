<script lang="ts">
	import '../app.css';
	import { username, logout } from "$lib/stores/userStore";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { browser } from '$app/environment';
	import TweakpaneManager from '$lib/utils/TweakpaneManager'; 

	let { children } = $props(); // Svelte 5: Get children prop

	// Svelte 5: Use $derived for computed values
	let isGameplayPage = $derived($page.url.pathname.startsWith('/solo/play/'));

	// Svelte 5: $effect for side effects (runs after render, client-side implicitly)
	$effect(() => {
		// Initialize Tweakpane on component mount (client-side)
		TweakpaneManager.init();

		// Key listener for Tweakpane toggle
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.code === 'Backquote') { 
				console.log('Backquote key pressed, toggling Tweakpane...'); 
				TweakpaneManager.toggleVisibility();
			}
		};
		window.addEventListener('keydown', handleKeyDown);

		// Cleanup function for the effect
		return () => {
			console.log('Layout effect cleanup');
			window.removeEventListener('keydown', handleKeyDown);
			TweakpaneManager.dispose(); // Dispose Tweakpane
		};
	});

	// Svelte 5: Separate $effect for redirection logic (runs after render, client-side implicitly)
	$effect(() => {
		console.log('Checking auth state...', $username, $page.url.pathname);
		if ($page.url.pathname !== '/') { 
			if (!$username) { // If no user is set
				if (TweakpaneManager.getSkipLogin()) { // And skipLogin is enabled
					console.log('Auto-logging in via Skip Login...');
					const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
					const guestUsername = `GUEST-${randomId}`;
					username.set(guestUsername); // Set the store
				} else { // No user, skipLogin is disabled
					console.log('Redirecting to login (effect, user not set, skipLogin off)...', $page.url.pathname);
					goto('/', { replaceState: true }); 
				}
			}
			// If $username IS set, do nothing, allow access
		}
	});

</script>

<div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
	{#if !isGameplayPage}
	<header class="bg-gray-800 p-4 shadow-md">
		<div class="container mx-auto flex justify-between items-center">
			<a href="/home" class="text-xl font-bold text-purple-400 hover:text-purple-300">MUG Rhythm</a>
			<div class="flex items-center space-x-4">
				{#if $username}
					<span class="text-gray-300">Welcome, <span class="font-semibold text-purple-300">{$username}</span>!</span>
					<button 
						onclick={logout}
						class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline transition-colors"
					>
						Logout
					</button>
				{/if}
			</div>
		</div>
	</header>
	{/if}

	<main class="flex-grow container mx-auto p-4">
		{@render children()}
	</main>

	{#if !isGameplayPage}
	<footer class="bg-gray-800 p-2 text-center text-xs text-gray-500">
		MUG MVP
	</footer>
	{/if}
</div>
