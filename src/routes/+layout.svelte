<script lang="ts">
	import '../app.css';
	import { username, logout } from '$lib/stores/userStore';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { isPaused, skipLogin as skipLoginStore } from '$lib/stores/settingsStore';

	let { children } = $props(); // Svelte 5: Get children prop

	// Svelte 5: Use $derived for computed values
	let isGameplayPage = $derived($page.url.pathname.startsWith('/solo/play/'));

	// Svelte 5: $effect for side effects (runs after render, client-side implicitly)
	$effect(() => {
		// Effect for keyboard listeners (Escape for pause)
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.code === 'Escape') {
				if (isGameplayPage) {
					isPaused.update((p) => !p);
					console.log('Escape pressed, toggling pause to:', !$isPaused);
				}
			}
			// Removed Tilde key listener for Tweakpane
		};
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	// Svelte 5: Separate $effect for redirection logic (runs after render, client-side implicitly)
	$effect(() => {
		console.log(
			'Auth check: user:',
			$username,
			'path:',
			$page.url.pathname,
			'skip:',
			$skipLoginStore
		);
		if ($page.url.pathname !== '/') {
			if (!$username) {
				if ($skipLoginStore) {
					console.log('Auto-logging in via Skip Login store...');
					const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
					const guestUsername = `GUEST-${randomId}`;
					username.set(guestUsername);
				} else {
					console.log(
						'Redirecting to login (effect, user not set, skipLoginStore off)...',
						$page.url.pathname
					);
					goto('/', { replaceState: true });
				}
			}
		}
	});
</script>

<div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-mono">
	{#if !isGameplayPage}
		<header class="bg-gray-800 p-4 shadow-md !fixed !top-0 !left-0 !right-0 !z-10">
			<div class="container mx-auto flex justify-between items-center">
				<a href="/home" class="text-xl font-bold text-purple-400 hover:text-purple-300"
					>MUG Rhythm</a
				>
				<div class="flex items-center space-x-4">
					{#if $username}
						<span class="text-gray-300"
							>Welcome, <span class="font-semibold text-purple-300">{$username}</span>!</span
						>
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

	<main class="flex-grow {isGameplayPage ? '' : 'container mx-auto p-4 pt-20 pb-10'}">
		{@render children()}
	</main>

	{#if !isGameplayPage}
		<footer
			class="bg-gray-800 p-2 text-center text-xs text-gray-500 !fixed !bottom-0 !left-0 !right-0 !z-10"
		>
			MUG MVP
		</footer>
	{/if}
</div>
