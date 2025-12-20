<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { authClient } from "$lib/auth-client";
import { orpcClient } from "$lib/rpc/client";
import { stretchIn } from "$lib/transitions/stretchIn";
import { onMount, tick } from "svelte";
import Waves from "$lib/components/Waves.svelte";
import { fade, fly } from "svelte/transition";

let usernameInput = $state(page.url.searchParams.get("username") || "");
let isLoading = $state(false);
let error = $state<string | null>(null);

// References to DOM elements
let usernameInputElement = $state<HTMLInputElement | undefined>();

let showPanel = $state(false); // For the main join form animation

onMount(() => {
	const urlUsername = page.url.searchParams.get("username");
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

	if (usernameInput.trim() === "") {
		const { data: signInData, error: anonError } =
			await authClient.signIn.anonymous();
		if (anonError) {
			error = anonError.message || null;
		} else if (signInData?.user) {
			goto("/home");
		} else {
			error = "Failed to create guest session.";
		}
	} else {
		try {
			const res = await orpcClient.user.checkUsername({
				username: usernameInput.trim(),
			});

			if (!res.available) {
				goto(`/login?username=${encodeURIComponent(usernameInput.trim())}`);
			} else {
				goto(
					`/claim-username?username=${encodeURIComponent(usernameInput.trim())}`,
				);
			}
		} catch (e: any) {
			error = e.message || "Failed to check username.";
			goto(
				`/claim-username?username=${encodeURIComponent(usernameInput.trim())}`,
			);
		}
	}
	isLoading = false;
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Enter") {
		handleMainJoin();
	}
}
</script>

<svelte:head>
	<title>Welcome to MUG - Rhythm Game</title>
</svelte:head>

<div class="fixed inset-0 flex items-center justify-center overflow-hidden bg-gray-900 text-white font-sans select-none">
	<!-- Dynamic Background -->
	<div class="absolute inset-0 z-0 opacity-60">
		<Waves />
		<div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
		<div class="absolute inset-0 bg-radial-gradient from-transparent to-gray-900 opacity-80"></div>
	</div>

	<!-- Main Content -->
	<div class="relative z-10 w-full max-w-md p-6">
		
		<!-- Logo / Branding -->
		<div class="mb-12 text-center" in:fly={{ y: -50, duration: 800, delay: 200 }}>
			<h1 class="text-9xl font-black italic tracking-tighter text-white drop-shadow-2xl leading-none">
				MUG<span class="text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-cyan-400">.</span>
			</h1>
			<p class="text-xl text-cyan-400 font-bold tracking-[0.5em] uppercase mt-2">
				Rhythm Game Engine
			</p>
		</div>

		<!-- Join Panel -->
		{#if showPanel}
			<div
				transition:stretchIn={{ startScaleX: 0.8, startScaleY: 0.8 }}
				class="bg-gray-800/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
			>
				<div class="p-8 pb-6">
					<h2 class="text-2xl font-bold text-white mb-2">Join the Action</h2>
					<p class="text-gray-400 text-sm leading-relaxed">
						Enter a username to start playing, or leave it blank to join as a <span class="text-white font-bold">Guest</span>.
					</p>
				</div>

				<div class="px-8 pb-8 space-y-6">
					<div>
						<label for="username" class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
							>Username</label
						>
						<div class="relative">
							<input
								type="text"
								id="username"
								class="w-full bg-gray-900/80 border border-gray-700 text-white text-lg rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent block w-full p-4 placeholder-gray-600 transition-all outline-none"
								placeholder="Guest"
								bind:this={usernameInputElement}
								bind:value={usernameInput}
								onkeydown={handleKeydown}
							/>
						</div>
					</div>

					<button
						class="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xl tracking-widest rounded-xl shadow-lg shadow-purple-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						type="button"
						disabled={isLoading}
						onclick={handleMainJoin}
					>
						{isLoading ? 'CONNECTING...' : 'PLAY NOW'}
					</button>

					{#if error}
						<div class="bg-red-900/30 border border-red-500/30 text-red-200 p-3 rounded-lg text-sm text-center" transition:fade>
							{error}
						</div>
					{/if}

					<div class="text-center">
						<p class="text-[10px] text-gray-500 uppercase tracking-wide">
							By joining, you agree to our
							<a href="/about/terms" class="text-gray-400 hover:text-white underline decoration-gray-600 underline-offset-2 transition-colors">Terms</a>
							&
							<a href="/about/privacy" class="text-gray-400 hover:text-white underline decoration-gray-600 underline-offset-2 transition-colors">Privacy</a>
						</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom Utility for radial gradient overlay */
	.bg-radial-gradient {
		background-image: radial-gradient(circle at center, transparent 0%, rgb(17, 24, 39) 100%);
	}
</style>