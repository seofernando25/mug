<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import { stretchIn } from '$lib/transitions/stretchIn';
	import { onMount, tick } from 'svelte';

	let usernameInput = $state(page.url.searchParams.get('username') || '');
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// References to DOM elements
	let usernameInputElement = $state<HTMLInputElement | undefined>();

	let showPanel = $state(false); // For the main join form animation

	onMount(() => {
		const urlUsername = page.url.searchParams.get('username');
		if (urlUsername) {
			usernameInput = urlUsername;
		}
		showPanel = true;
		tick().then(() => {
			usernameInputElement?.focus();
		});
	});

	async function handleMainJoin(event?: Event) {
		event?.preventDefault();
		if (isLoading) return;
		isLoading = true;
		error = null;

		if (usernameInput.trim() === '') {
			const { data: signInData, error: anonError } = await authClient.signIn.anonymous();
			if (anonError) {
				error = anonError.message || null;
			} else if (signInData?.user) {
				goto('/home');
			} else {
				error = 'Failed to create guest session.';
			}
		} else {
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
					goto(`/claim-username?username=${encodeURIComponent(usernameInput.trim())}`);
				}
			} catch (e: any) {
				error = e.message || 'Failed to check username.';
			}
		}
		isLoading = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleMainJoin();
		}
	}
</script>

<svelte:head>
	<title>Welcome to MUG - Rhythm Game</title>
</svelte:head>

<div
	class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 w-screen overflow-clip"
>
	<!-- No Active Session - Main Join Form -->
	{#if showPanel}
		<div
			transition:stretchIn={{ startScaleX: 4, startScaleY: 0.1 }}
			class="
		fixed left-1/2 top-1/2
		-translate-x-1/2 -translate-y-1/2
		w-[calc(728px-2em)] max-w-[calc(95vw-2em)] max-h-[calc(95vh-2em)]
		z-[100000000]
		bg-gray-800 text-gray-300
		rounded-[3px]
		shadow-lg
		flex flex-col justify-center
		border border-gray-700
		text-left
	"
		>
			<div class="p-4 pb-2">
				<h1 class="text-3xl font-bold mb-2 text-purple-400">Welcome to MUG</h1>
				<p class="text-gray-500 text-left">
					Play together in this modern, web-based rhythm game.<br />
					Enter a name to join, or leave it blank for a guest account.
				</p>
			</div>
			<hr class="m-0 border-gray-700" />
			<div class="p-4 pt-2 mt-0">
				<label for="username" class="block text-sm font-medium text-gray-500 mb-2"
					>Enter your name:</label
				>
				<input
					type="text"
					id="username"
					class="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-purple-400 focus:border-purple-400 block w-full p-2.5 mb-2"
					placeholder="Leave empty for guest access"
					bind:this={usernameInputElement}
					bind:value={usernameInput}
					onkeydown={handleKeydown}
				/>
				<p class="text-xs text-gray-500">
					By joining, you accept the
					<a href="/about/terms" class="underline text-teal-400 hover:text-teal-500">terms of use</a
					>,
					<a href="/about/privacy" class="underline text-teal-400 hover:text-teal-500"
						>privacy policy</a
					>
					and
					<a href="/about/rules" class="underline text-teal-400 hover:text-teal-500">rules</a>.
				</p>
			</div>
			<button
				class="w-full bg-purple-400 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition"
				type="button"
				disabled={isLoading}
				onclick={handleMainJoin}
			>
				{isLoading ? 'Processing...' : 'JOIN'}
			</button>

			{#if error}<p class="text-red-400 mt-4">{error}</p>{/if}
		</div>
	{/if}
</div>
