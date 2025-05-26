<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { stretchIn } from '$lib/actions/stretchIn.js';
	import { onMount } from 'svelte';
	const { data } = $props();
	const session = data.session;

	let joinButtonElement = $state<HTMLButtonElement | undefined>();
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function handleLogout() {
		isLoading = true;
		error = null;
		const { error: signOutError } = await authClient.signOut();
		if (signOutError) {
			error = signOutError.message || null;
			isLoading = false;
		} else {
			window.location.href = '/'; // Redirect to home after logout
		}
	}

	function handleJoinGame() {
		console.log('join game');
		goto('/home'); // Navigate to the actual game/home screen
	}

	onMount(() => {
		if (joinButtonElement) joinButtonElement.focus();
	});
</script>

<svelte:head>
	<title>Welcome Back - MUG</title>
</svelte:head>

<div
	class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 w-screen overflow-clip"
>
	{#if session?.user}
		<!-- Should always be true here due to server load -->
		<div
			in:stretchIn={{ startScaleX: 4, startScaleY: 0.1 }}
			class="text-center bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full"
		>
			<h1 class="text-3xl font-bold mb-4">Welcome back to MUG!</h1>
			<p class="text-lg mb-2">Ready to jump back in?</p>
			<p class="text-2xl font-semibold mb-6 text-teal-400">
				{session.user.name || session.user.email || 'Player'}
			</p>
			<div class="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
				<button
					bind:this={joinButtonElement}
					onclick={handleJoinGame}
					class="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
				>
					Join Game
				</button>
				<button
					onclick={handleLogout}
					disabled={isLoading}
					class="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out disabled:opacity-50"
				>
					{isLoading ? 'Logging out...' : 'Not you? Log Out'}
				</button>
			</div>
			{#if error}<p class="text-red-400 mt-4 text-center">{error}</p>{/if}
		</div>
	{:else}
		<!-- This part should ideally not be reached if +page.server.ts redirects correctly -->
		<p>Loading session...</p>
	{/if}
</div>
