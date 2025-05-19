<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { onMount } from 'svelte';

	const { data } = $props();

	const session = data.session;

	let usernameInput = $state(data.session?.user?.username || '');
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// States for UI flow
	let showNonExistentUserPanel = $state(false);
	let nonExistentUsername = $state('');

	// References to DOM elements
	let usernameInputElement = $state<HTMLInputElement | undefined>();
	let claimButtonElement = $state<HTMLButtonElement | undefined>();

	onMount(() => {
		// Focus on username input when the page loads
		usernameInputElement?.focus();
	});

	// Effect to focus on the claim button when the panel is shown
	$effect(() => {
		if (showNonExistentUserPanel) {
			// Use setTimeout to ensure the DOM has updated
			setTimeout(() => {
				claimButtonElement?.focus();
			}, 0);
		}
	});

	async function handleLogout() {
		isLoading = true;
		error = null;
		const { error: signOutError } = await authClient.signOut();
		if (signOutError) {
			error = signOutError.message || null;
		} else {
			// Reload the page to reflect logout and re-fetch session in layout
			window.location.reload();
		}
		isLoading = false;
	}

	function handleJoinGame() {
		goto('/home');
	}

	async function handleMainJoin(event: Event) {
		event.preventDefault();
		if (isLoading) return;
		isLoading = true;
		error = null;
		showNonExistentUserPanel = false;

		if (usernameInput.trim() === '') {
			// Anonymous join
			const { data, error: anonError } = await authClient.signIn.anonymous();
			if (anonError) {
				error = anonError.message || null;
			} else if (data?.user) {
				goto('/home');
			} else {
				error = 'Failed to create guest session.';
			}
		} else {
			// Username provided, check if exists
			try {
				const response = await fetch(
					`/api/check-username?username=${encodeURIComponent(usernameInput.trim())}`
				);
				if (!response.ok) {
					const errData = await response.json();
					throw new Error(errData.error || `Server error: ${response.status}`);
				}
				const { exists } = await response.json();

				if (exists) {
					goto(`/login?username=${encodeURIComponent(usernameInput.trim())}`);
				} else {
					nonExistentUsername = usernameInput.trim();
					showNonExistentUserPanel = true;
				}
			} catch (e: any) {
				error = e.message || 'Failed to check username.';
			}
		}
		isLoading = false;
	}

	function handleBackFromPanel() {
		showNonExistentUserPanel = false;
		usernameInput = nonExistentUsername; // Keep the username in the input
	}

	async function handleStayAnonymous() {
		if (isLoading) return;
		isLoading = true;
		error = null;
		const { data, error: anonError } = await authClient.signIn.anonymous(); // Will use generated guest-XXXXX
		if (anonError) {
			error = anonError.message || null;
		} else if (data?.user) {
			goto('/home');
		} else {
			error = 'Failed to create guest session.';
		}
		isLoading = false;
	}

	function handleRegisterNonExistentUser() {
		goto(`/register?username=${encodeURIComponent(nonExistentUsername)}`);
	}
</script>

<svelte:head>
	<title>Welcome to MUG - Rhythm Game</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
	{#if session?.user}
		<!-- Active Session -->
		<div class="text-center bg-gray-800 p-8 rounded-lg shadow-xl">
			<h1 class="text-3xl font-bold mb-4">Welcome back to MUG!</h1>
			<p class="text-lg mb-2">Is this you?</p>
			<p class="text-2xl font-semibold mb-6 text-teal-400">
				{session.user.name || session.user.email || 'User'}
			</p>
			<div class="space-x-4">
				<button
					onclick={handleLogout}
					disabled={isLoading}
					class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out disabled:opacity-50"
				>
					{isLoading ? 'Logging out...' : 'Log Out'}
				</button>
				<button
					onclick={handleJoinGame}
					class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
				>
					Join Game
				</button>
			</div>
			{#if error}<p class="text-red-400 mt-4">{error}</p>{/if}
		</div>
	{:else if showNonExistentUserPanel}
		<!-- User Does Not Exist Panel -->
		<div class="text-center bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
			<h2 class="text-2xl font-bold mb-3">Want to join?</h2>
			<p class="mb-4">
				The username <span class="font-semibold text-teal-400">{nonExistentUsername}</span> hasn't been
				registered.
			</p>
			<p class="mb-6 text-sm text-gray-400">
				Do you want to claim it as yours, or play anonymously? You won't be able to submit scores to
				the leaderboards or play in matchmaking when anonymous.
			</p>
			<div class="flex flex-col space-y-3">
				<button
					bind:this={claimButtonElement}
					onclick={handleRegisterNonExistentUser}
					class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
				>
					Claim <span class="font-semibold">{nonExistentUsername}</span> & Register
				</button>
				<button
					onclick={handleStayAnonymous}
					disabled={isLoading}
					class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out disabled:opacity-50"
				>
					{isLoading ? 'Joining...' : 'Stay Anonymous & Play'}
				</button>
				<button
					onclick={handleBackFromPanel}
					class="bg-transparent hover:bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-lg border border-gray-600 transition duration-150 ease-in-out"
				>
					Back
				</button>
			</div>
			{#if error}<p class="text-red-400 mt-4">{error}</p>{/if}
		</div>
	{:else}
		<!-- No Active Session - Main Join Form -->
		<div class="text-center bg-gray-800 p-8 rounded-lg shadow-xl max-w-lg w-full">
			<h1 class="text-4xl font-bold mb-3">Welcome to MUG!</h1>
			<p class="text-lg text-gray-300 mb-6">Play together in this modern, web-based rhythm game.</p>

			<hr class="border-gray-700 my-6" />

			<p class="mb-2 text-gray-400">Enter a name to join, or leave it blank for a guest account.</p>
			<form onsubmit={handleMainJoin} class="mb-4">
				<input
					type="text"
					bind:value={usernameInput}
					bind:this={usernameInputElement}
					placeholder="Enter username (optional)"
					class="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition mb-4"
				/>
				<button
					type="submit"
					disabled={isLoading}
					class="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out disabled:opacity-50"
				>
					{isLoading ? 'Processing...' : 'JOIN GAME'}
				</button>
			</form>

			<p class="text-xs text-gray-500">
				By joining, you accept the
				<a href="/about/terms" class="underline hover:text-teal-400">terms of use</a>,
				<a href="/about/privacy" class="underline hover:text-teal-400">privacy policy</a> and
				<a href="/about/rules" class="underline hover:text-teal-400">rules</a>.
			</p>
			{#if error}<p class="text-red-400 mt-4">{error}</p>{/if}
		</div>
	{/if}
</div>
