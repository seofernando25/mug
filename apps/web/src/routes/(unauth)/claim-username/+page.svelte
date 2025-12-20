<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { authClient } from "$lib/auth-client";
import { onMount, tick } from "svelte";
import { fade, fly } from "svelte/transition";

let isLoading = $state(false);
let error = $state<string | null>(null);
let nonExistentUsername = $state("");

// Reference to DOM element
let claimButtonElement = $state<HTMLButtonElement | undefined>();

onMount(() => {
	const urlUsername = page.url.searchParams.get("username");
	if (urlUsername) {
		nonExistentUsername = urlUsername;
	} else {
		goto("/"); 
	}
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
		goto("/home");
	} else {
		error = "Failed to create guest session.";
	}
	isLoading = false;
}

function handleRegisterNonExistentUser() {
	goto(`/register?username=${encodeURIComponent(nonExistentUsername)}`);
}

function handleGoBack() {
	goto(`/?username=${encodeURIComponent(nonExistentUsername)}`);
}
</script>

<svelte:head>
	<title>Claim Username - MUG</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-900 p-6 overflow-hidden relative">
	<!-- Ambient Background Glow -->
	<div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full"></div>
	<div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 blur-[120px] rounded-full"></div>

	<div 
		class="w-full max-w-lg space-y-10 relative z-10"
		in:fade={{ duration: 400 }}
	>
		<!-- Header -->
		<header class="text-center space-y-2">
			<h1 class="text-7xl font-black italic tracking-tighter text-white drop-shadow-2xl">
				CLAIM<span class="text-cyan-400">.</span>
			</h1>
			<p class="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs px-4 leading-relaxed">
				User <span class="text-cyan-400">{nonExistentUsername}</span> is available for initialization
			</p>
		</header>

		<!-- Info Card -->
		<div 
			class="p-10 bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] shadow-2xl space-y-10"
			in:fly={{ y: 40, delay: 100, duration: 600 }}
		>
			<div class="space-y-4">
				<p class="text-gray-300 leading-relaxed italic font-bold text-center">
					Don't lose your name!
				</p>
				<p class="text-xs text-gray-500 text-center leading-relaxed font-medium">
					Anonymous users cannot submit leaderboard scores or participate in ranked matchmaking.
				</p>
			</div>

			<div class="flex flex-col gap-4">
				<button
					bind:this={claimButtonElement}
					onclick={handleRegisterNonExistentUser}
					class="w-full py-5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-black text-xl italic tracking-widest text-white shadow-lg shadow-pink-500/20 hover:scale-[1.02] hover:shadow-pink-500/40 transition active:scale-[0.98]"
				>
					CLAIM & REGISTER
				</button>

				<button
					onclick={handleStayAnonymous}
					disabled={isLoading}
					class="w-full py-4 bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-cyan-400 transition-all active:scale-[0.98] disabled:opacity-50"
				>
					{isLoading ? 'INITIALIZING...' : 'STAY ANONYMOUS'}
				</button>

				<button
					onclick={handleGoBack}
					class="w-full py-3 text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 hover:text-gray-400 transition-colors"
				>
					GO BACK
				</button>
			</div>

			{#if error}
				<div class="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
					<p class="text-red-400 text-[10px] font-black uppercase tracking-widest">{error}</p>
				</div>
			{/if}
		</div>
	</div>
</div>