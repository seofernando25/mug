<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { onMount } from "svelte";
import { authClient } from "$lib/auth-client";
import { fade, fly } from "svelte/transition";

let username = $state("");
let password = $state("");
let isLoading = $state(false);
let error = $state<string | null>(null);

// References to DOM elements
let usernameInputElement = $state<HTMLInputElement | undefined>();
let passwordInputElement = $state<HTMLInputElement | undefined>();

onMount(() => {
	const urlUsername = page.url.searchParams.get("username");
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
		error = "Username and password are required.";
		return;
	}
	isLoading = true;
	error = null;

	const { data, error: loginError } = await authClient.signIn.username({
		username,
		password,
	});

	if (loginError) {
		error =
			loginError.message || "Login failed. Please check your credentials.";
	} else if (data?.user) {
		goto("/home");
	} else {
		error = "Login failed. Please try again.";
	}
	isLoading = false;
}
</script>

<svelte:head>
	<title>Login - MUG</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-900 p-6 overflow-hidden relative">
	<!-- Ambient Background Glow -->
	<div class="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 blur-[120px] rounded-full"></div>
	<div class="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full"></div>

	<div 
		class="w-full max-w-md space-y-10 relative z-10"
		in:fade={{ duration: 400 }}
	>
		<!-- Header -->
		<header class="text-center space-y-2">
			<h1 class="text-7xl font-black italic tracking-tighter text-white drop-shadow-2xl">
				LOGIN<span class="text-cyan-400">.</span>
			</h1>
			<p class="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs">
				Resume your rhythm legacy
			</p>
		</header>

		<!-- Form Card -->
		<div 
			class="p-10 bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] shadow-2xl space-y-8"
			in:fly={{ y: 40, delay: 100, duration: 600 }}
		>
			{#if page.url.searchParams.get('username')}
				<div class="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-2xl text-center">
					<p class="text-[10px] font-black uppercase tracking-widest text-cyan-400">
						Welcome back, <span class="text-white">{page.url.searchParams.get('username')}</span>
					</p>
				</div>
			{/if}

			<form onsubmit={handleLogin} class="space-y-6">
				<!-- Username -->
				<div class="space-y-2">
					<label for="username" class="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Username</label>
					<input
						type="text"
						id="username"
						bind:value={username}
						bind:this={usernameInputElement}
						required
						autocomplete="username"
						placeholder="TheBeastMaster"
						class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-bold"
					/>
				</div>

				<!-- Password -->
				<div class="space-y-2">
					<label for="password" class="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						bind:this={passwordInputElement}
						required
						autocomplete="current-password"
						placeholder="••••••••"
						class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-bold"
					/>
				</div>

				{#if error}
					<p class="text-red-400 text-[10px] font-black uppercase text-center tracking-widest leading-relaxed">
						{error}
					</p>
				{/if}

				<button
					type="submit"
					disabled={isLoading}
					class="w-full py-5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-black text-xl italic tracking-widest text-white shadow-lg shadow-pink-500/20 hover:scale-[1.02] hover:shadow-pink-500/40 transition active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
				>
					{isLoading ? 'INITIALIZING...' : 'SIGN IN'}
				</button>
			</form>

			<footer class="space-y-4 text-center">
				<p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
					New to the rhythm?
					<a href="/register" class="text-cyan-400 hover:text-cyan-300 transition-colors ml-1 underline decoration-2 underline-offset-4">REGISTER</a>
				</p>
			</footer>
		</div>
	</div>
</div>