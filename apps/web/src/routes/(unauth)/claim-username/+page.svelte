<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import { stretchIn } from '$lib/transitions/stretchIn';
	import { onMount, tick } from 'svelte';

	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let nonExistentUsername = $state('');

	// Reference to DOM element
	let claimButtonElement = $state<HTMLButtonElement | undefined>();

	onMount(() => {
		const urlUsername = page.url.searchParams.get('username');
		if (urlUsername) {
			nonExistentUsername = urlUsername;
		} else {
			// Fallback or redirect if no username is provided,
			// as this page doesn't make sense without it.
			goto('/'); // Or show an error message
		}
		// Focus on claim button when the panel is shown
		tick().then(() => {
			claimButtonElement?.focus();
		});
	});

	async function handleStayAnonymous() {
		if (isLoading) return;
		isLoading = true;
		error = null;
		const { data, error: anonError } = await authClient.signIn.anonymous();
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

	function handleGoBack() {
		// Navigate back to the main page, possibly with the username prefilled
		goto(`/?username=${encodeURIComponent(nonExistentUsername)}`);
	}
</script>

<svelte:head>
	<title>Claim Username - MUG</title>
</svelte:head>

<div
	class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 w-screen overflow-clip"
>
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
			<h2 class="text-3xl font-bold mb-2 text-purple-400">Want to join?</h2>
			<p class="text-gray-500 text-left">
				The username <span class="font-semibold text-teal-400">{nonExistentUsername}</span> hasn't been
				registered.
			</p>
			<p class="text-gray-500 text-left mt-2">
				Do you want to claim it as yours, or play anonymously? You won't be able to submit scores to
				the leaderboards or play in matchmaking when anonymous.
			</p>
		</div>
		<hr class="m-0 border-gray-700" />
		<div class="p-4 pt-3 flex flex-col space-y-3">
			<button
				bind:this={claimButtonElement}
				onclick={handleRegisterNonExistentUser}
				class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition"
			>
				Claim <span class="font-semibold">{nonExistentUsername}</span> & Register
			</button>
			<button
				onclick={handleStayAnonymous}
				disabled={isLoading}
				class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition disabled:opacity-50"
			>
				{isLoading ? 'Joining...' : 'Stay Anonymous & Play'}
			</button>
			<button
				onclick={handleGoBack}
				class="w-full bg-transparent hover:bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded border border-gray-600 focus:outline-none focus:shadow-outline transition"
			>
				Back
			</button>
		</div>
		{#if error}
			<div class="p-4 pt-0 text-center">
				<p class="text-red-400 text-sm">{error}</p>
			</div>
		{/if}
	</div>
</div>
