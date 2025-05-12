<script lang="ts">
	import '../app.css';
	import { username, logout } from "$lib/stores/userStore";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { browser } from '$app/environment'; // Import browser
	import type { Unsubscriber } from 'svelte/store';
	import TweakpaneManager from '$lib/utils/TweakpaneManager'; // Import TweakpaneManager

	// Assuming TweakpaneManager exists and has toggleVisibility
	// import TweakpaneManager from '$lib/utils/TweakpaneManager'; // Adjust path if needed

	onMount(() => {
		let usernameUnsubscriber: Unsubscriber;

		// Subscribe to username changes and handle redirection
		usernameUnsubscriber = username.subscribe(currentUsername => {
			// Check page store within subscription to get current path
			const currentPath = $page.url.pathname;
			if (!currentUsername && currentPath !== '/') {
				// Redirect logic might be better handled in the reactive block below now
				// But keeping this for immediate client-side reaction if needed
				console.log('Redirecting to login (onMount check)... Should be handled by reactive block?');
				// if (browser) goto('/', { replaceState: true }); 
			}
		});

		TweakpaneManager.init(); // Initialize Tweakpane

		// Key listener for Tweakpane toggle
		const handleKeyDown = (event: KeyboardEvent) => {
			// Use event.code to detect the physical key press, ignoring Shift state
			if (event.code === 'Backquote') { 
				console.log('Backquote key pressed, toggling Tweakpane...'); // Added log for confirmation
				TweakpaneManager.toggleVisibility();
			}
		};
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			// Cleanup
			window.removeEventListener('keydown', handleKeyDown);
			if (usernameUnsubscriber) {
				usernameUnsubscriber();
			}
			TweakpaneManager.dispose(); // Dispose Tweakpane
		};
	});

	// Combined Redirect & Skip Login Logic (Client-side Guarded)
	$: {
		if (browser && $page.url.pathname !== '/') { // *** Added browser check ***
			if (!$username) { // If no user is set
				if (TweakpaneManager.getSkipLogin()) { // And skipLogin is enabled
					console.log('Auto-logging in via Skip Login...');
					const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
					const guestUsername = `GUEST-${randomId}`;
					username.set(guestUsername); // Set the store
				} else { // No user, skipLogin is disabled
					console.log('Redirecting to login (reactive, browser, user not set, skipLogin off)...', $page.url.pathname);
					goto('/', { replaceState: true }); // Use replaceState for better history
				}
			}
			// If $username IS set, do nothing, allow access
		}
	}

	// REMOVED Redirect logic reactive block
	// $: {
	// 	if (!$username && $page.url.pathname !== '/') {
	// 		console.log('Redirecting to login...', $username, $page.url.pathname);
	// 		goto('/');
	// 	}
	// }
</script>

<div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
	<header class="bg-gray-800 p-4 shadow-md fixed top-0 left-0 right-0 z-10">
		<div class="container mx-auto flex justify-between items-center">
			<a href="/home" class="text-xl font-bold text-purple-400 hover:text-purple-300">MUG Rhythm</a>
			<div class="flex items-center space-x-4">
				{#if $username}
					<span class="text-gray-300">Welcome, <span class="font-semibold text-purple-300">{$username}</span>!</span>
					<button 
						on:click={logout} 
						class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline transition-colors"
					>
						Logout
					</button>
				{/if}
			</div>
		</div>
	</header>

	<main class="flex-grow container mx-auto p-4 pt-20 pb-10">
		<slot />
	</main>

	<footer class="bg-gray-800 p-2 text-center text-xs text-gray-500 fixed bottom-0 left-0 right-0 z-10">
		MUG MVP
	</footer>
</div>
