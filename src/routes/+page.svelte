<svelte:head>
	<title>Login - MUG</title>
</svelte:head>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { username as usernameStore } from '$lib/stores/userStore';

	let usernameInput = '';

	function join() {
		let finalUsername = usernameInput.trim();
		if (!finalUsername) {
			const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
			finalUsername = `GUEST-${randomId}`;
		}
		usernameStore.set(finalUsername);
		goto('/home');
	}
</script>

<div class="flex flex-col items-center justify-center h-full">
	<h1 class="text-4xl font-bold mb-8 text-purple-400">Welcome to MUG</h1>
	<div class="w-full max-w-xs">
		<label for="username" class="block text-sm font-medium text-gray-300 mb-2">Enter your name:</label>
		<input type="text" id="username" class="bg-gray-700 border border-gray-600 text-gray-100 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5 mb-4" placeholder="Leave empty for guest access" bind:value={usernameInput}>
		<button class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button" on:click={join}>
			JOIN
		</button>
	</div>
</div>

<style>
	/* Add some basic styling if desired */
	div {
		margin-top: 1rem;
	}
	input {
		margin-right: 0.5rem;
	}
</style>
