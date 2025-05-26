<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import MusicPlayer from '$lib/components/MusicPlayer.svelte';
	import '../app.css';

	let { children } = $props();

	let sessionData = $state(authClient.useSession);

	let isAuthRoute = $derived(
		page.url.pathname === '/' ||
			page.url.pathname === '/login' ||
			page.url.pathname === '/register' ||
			page.url.pathname === '/claim-username' ||
			page.url.pathname === '/express'
	);
	let isGameplayPage = $derived(page.url.pathname.startsWith('/solo/play/'));

	let currentUser = $derived($sessionData.data?.user);
</script>

<div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-mono">
	{#if !isGameplayPage && !isAuthRoute}
		<header class="bg-gray-800 p-4 shadow-md !fixed !top-0 !left-0 !right-0 !z-10">
			<div class="container mx-auto flex justify-between items-center">
				<a href="/home" class="text-xl font-bold text-purple-400 hover:text-purple-300"
					>MUG Rhythm</a
				>
				<div class="flex items-center space-x-4">
					{#if currentUser}
						<span class="text-gray-300"
							>Welcome, <span class="font-semibold text-purple-300">
								{currentUser.name || currentUser.username || currentUser.id}
							</span>!</span
						>
						<button
							onclick={async () => {
								await authClient.signOut();
								goto('/');
							}}
							class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline transition-colors"
						>
							Logout
						</button>
					{:else if !isAuthRoute}
						<!-- Don't show login/register on auth pages itself -->
						<a href="/login" class="text-purple-300 hover:text-purple-200">Login</a>
						<a href="/register" class="text-purple-300 hover:text-purple-200">Register</a>
					{/if}
					<MusicPlayer />
				</div>
			</div>
		</header>
	{/if}

	<main
		class="flex flex-col flex-grow {isGameplayPage || isAuthRoute
			? ''
			: 'container mx-auto p-4 pt-20 pb-10'}"
	>
		{@render children()}
	</main>
</div>
