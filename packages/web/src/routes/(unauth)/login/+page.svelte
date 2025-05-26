<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { authClient } from '$lib/auth-client';
	import { stretchIn } from '$lib/actions/stretchIn';

	let username = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// References to DOM elements
	let usernameInputElement = $state<HTMLInputElement | undefined>();
	let passwordInputElement = $state<HTMLInputElement | undefined>();

	onMount(() => {
		const urlUsername = page.url.searchParams.get('username');
		if (urlUsername) {
			username = urlUsername;
			// Focus on password field if username is provided
			passwordInputElement?.focus();
		} else {
			// Focus on username field if no username is provided
			usernameInputElement?.focus();
		}
	});

	async function handleLogin(event: Event) {
		event.preventDefault();
		if (!username || !password) {
			error = 'Username and password are required.';
			return;
		}
		isLoading = true;
		error = null;

		const { data, error: loginError } = await authClient.signIn.username({
			username,
			password
		});

		if (loginError) {
			error = loginError.message || 'Login failed. Please check your credentials.';
		} else if (data?.user) {
			goto('/home');
		} else {
			error = 'Login failed. Please try again.';
		}
		isLoading = false;
	}

	function goBack() {
		goto('/');
	}

	function forgotPassword() {
		alert('Password recovery with better-auth to be implemented.');
	}
</script>

<svelte:head>
	<title>Login to MUG</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
	<div
		in:stretchIn={{ startScaleX: 1.2, startScaleY: 0.6, duration: 400 }}
		class="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full"
	>
		<h1 class="text-3xl font-bold mb-6 text-center">Login to MUG</h1>
		{#if page.url.searchParams.get('username')}
			<p class="text-center text-gray-300 mb-4">
				Welcome back, <span class="font-semibold text-teal-400"
					>{page.url.searchParams.get('username')}</span
				>! Please enter your password.
			</p>
		{/if}
		<form onsubmit={handleLogin}>
			<div class="mb-4">
				<label for="username" class="block text-sm font-medium text-gray-300 mb-1">Username</label>
				<input
					type="text"
					id="username"
					bind:value={username}
					bind:this={usernameInputElement}
					required
					autocomplete="username"
					class="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
				/>
			</div>
			<div class="mb-6">
				<label for="password" class="block text-sm font-medium text-gray-300 mb-1">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					bind:this={passwordInputElement}
					required
					autocomplete="current-password"
					class="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
				/>
			</div>
			<button
				type="submit"
				disabled={isLoading}
				class="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-lg transition duration-150 ease-in-out disabled:opacity-50"
			>
				{isLoading ? 'Logging in...' : 'Login'}
			</button>
			{#if error}<p class="text-red-400 mt-4 text-center">{error}</p>{/if}
		</form>
		<p class="text-center mt-6 text-sm text-gray-400">
			Don't have an account? <a href="/register" class="text-teal-400 hover:underline"
				>Register here</a
			>.
		</p>
		<p class="text-center mt-2 text-sm text-gray-400">
			<a href="/" class="text-teal-400 hover:underline">Back to main page</a>
		</p>
	</div>
</div>
