<script lang="ts">
	import '../app.css';
	import { username, logout } from "$lib/stores/userStore";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import type { Unsubscriber } from 'svelte/store';

	// Assuming TweakpaneManager exists and has toggleVisibility
	// import TweakpaneManager from '$lib/utils/TweakpaneManager'; // Adjust path if needed

	onMount(() => {
		let usernameUnsubscriber: Unsubscriber;

		// Subscribe to username changes and handle redirection
		usernameUnsubscriber = username.subscribe(currentUsername => {
			// Check page store within subscription to get current path
			const currentPath = $page.url.pathname;
			if (!currentUsername && currentPath !== '/') {
				console.log('Redirecting to login (onMount check)...', currentUsername, currentPath);
				goto('/', { replaceState: true }); // Use replaceState to avoid breaking back button
			}
		});

		// Example: Initialize Tweakpane if needed
		// TweakpaneManager.init(); // Assuming an init method

		// Add key listener for Tweakpane toggle
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === '~') {
				// TweakpaneManager.toggleVisibility(); // Assuming this method exists
				console.log('Tweakpane toggle triggered (placeholder)');
			}
		};
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			// Cleanup
			window.removeEventListener('keydown', handleKeyDown);
			if (usernameUnsubscriber) {
				usernameUnsubscriber();
			}
			// Optional: Add Tweakpane cleanup if necessary
			// TweakpaneManager.dispose(); // Assuming a dispose method
		};
	});

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
