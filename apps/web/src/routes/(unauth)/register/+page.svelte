<script lang="ts">
import { enhance } from "$app/forms";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { authClient } from "$lib/auth-client";
import { ArkErrors } from "arktype";
import { onMount } from "svelte";
import { RegisterFormSchema, type RegisterFormData } from "./schema";
import { orpcClient } from "$lib/rpc/client";
import type { SubmitFunction } from "@sveltejs/kit";
import { fade, fly } from "svelte/transition";

const formData = $state<RegisterFormData>({
	username: "",
	email: "",
	password: "",
});

// References to DOM elements
let usernameInputElement = $state<HTMLInputElement | undefined>();
let emailInputElement = $state<HTMLInputElement | undefined>();

onMount(() => {
	const urlUsername = page.url.searchParams.get("username");
	if (urlUsername) {
		formData.username = urlUsername;
		// Focus on email field if username is provided
		emailInputElement?.focus();
	} else {
		// Focus on username field if no username is provided
		usernameInputElement?.focus();
	}
});

let errors = $state<{ [key: string]: string }>({});

let usernameCheckTimeout: ReturnType<typeof setTimeout> | null = null;
let lastCheckedUsername = "";
const unavailableUsernames = new Set<string>();
let asyncUsernameError = "";

$effect(() => {
	if (formData.username && formData.username !== lastCheckedUsername) {
		if (unavailableUsernames.has(formData.username)) {
			asyncUsernameError = "Username is already taken";
			return;
		}
		if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
		usernameCheckTimeout = setTimeout(async () => {
			try {
				const res = await orpcClient.user.checkUsername({
					username: formData.username,
				});

				lastCheckedUsername = formData.username;
				if (!res.available) {
					unavailableUsernames.add(formData.username);
					asyncUsernameError = "Username is already taken";
				} else if (asyncUsernameError === "Username is already taken") {
					asyncUsernameError = "";
				}
			} catch (e) {
				console.error(e);
			}
		}, 400); // 400ms debounce
	} else if (!formData.username) {
		asyncUsernameError = "";
	}
});

let isFormValid = $state(false);

$effect(() => {
	const result = RegisterFormSchema(formData);
	const currentErrors: { [key in keyof RegisterFormData | "form"]?: string } =
		{};
	let valid = true;
	if (result instanceof Array && result[0] && result[0].message) {
		// ArkType error array
		valid = false;
		result.forEach((problem) => {
			currentErrors[problem.path.join(".") as keyof RegisterFormData] =
				problem.message;
		});
	}
	// Merge async username error
	if (asyncUsernameError) {
		currentErrors.username = asyncUsernameError;
	}
	errors = currentErrors;
	isFormValid = valid && Object.keys(currentErrors).length === 0;
});

const handleSubmit: SubmitFunction = async ({ cancel, formData }) => {
	cancel();
	const entries = Object.fromEntries(formData.entries());
	const result = RegisterFormSchema(entries);

	if (result instanceof ArkErrors) {
		errors = result.reduce(
			(acc, p) => {
				acc[p.path.join(".")] = p.message;
				return acc;
			},
			{} as { [key: string]: string },
		);
		return;
	}

	// Sign up with api
	const signUpResult = await authClient.signUp.email({
		email: result.email,
		password: result.password,
		username: result.username,
		name: result.username,
	});
	if (signUpResult.error) {
		errors.form = signUpResult.error?.message || "An unknown error occurred";
	}

	goto("/home");
};
</script>

<svelte:head>
	<title>Register - MUG</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-900 p-6 overflow-hidden relative">
	<!-- Ambient Background Glow -->
	<div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full"></div>
	<div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 blur-[120px] rounded-full"></div>

	<div 
		class="w-full max-w-md space-y-10 relative z-10"
		in:fade={{ duration: 400 }}
	>
		<!-- Header -->
		<header class="text-center space-y-2">
			<h1 class="text-7xl font-black italic tracking-tighter text-white drop-shadow-2xl">
				JOIN<span class="text-purple-500">.</span>
			</h1>
			<p class="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs">
				Create your rhythm identity
			</p>
		</header>

		<!-- Form Card -->
		<div 
			class="p-10 bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] shadow-2xl space-y-8"
			in:fly={{ y: 40, delay: 100, duration: 600 }}
		>
			<form method="POST" use:enhance={handleSubmit} class="space-y-6">
				<!-- Username -->
				<div class="space-y-2">
					<div class="flex justify-between items-center px-1">
						<label for="username" class="text-[10px] font-black uppercase tracking-widest text-gray-400">Username</label>
						{#if errors.username}
							<span class="text-[10px] font-bold text-red-400 uppercase tracking-tighter italic">{errors.username}</span>
						{/if}
					</div>
					<input
						type="text"
						name="username"
						id="username"
						autocomplete="username"
						placeholder="TheBeastMaster"
						bind:value={formData.username}
						bind:this={usernameInputElement}
						class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-bold"
						required
					/>
				</div>

				<!-- Email -->
				<div class="space-y-2">
					<div class="flex justify-between items-center px-1">
						<label for="email" class="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</label>
						{#if errors.email}
							<span class="text-[10px] font-bold text-red-400 uppercase tracking-tighter italic">{errors.email}</span>
						{/if}
					</div>
					<input
						type="email"
						name="email"
						id="email"
						autocomplete="email"
						placeholder="you@rhythm.rocks"
						bind:value={formData.email}
						bind:this={emailInputElement}
						class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-bold"
						required
					/>
				</div>

				<!-- Password -->
				<div class="space-y-2">
					<div class="flex justify-between items-center px-1">
						<label for="password" class="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
						{#if errors.password}
							<span class="text-[10px] font-bold text-red-400 uppercase tracking-tighter italic">{errors.password}</span>
						{/if}
					</div>
					<input
						type="password"
						name="password"
						id="password"
						autocomplete="new-password"
						placeholder="••••••••"
						bind:value={formData.password}
						class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-bold"
						required
					/>
				</div>

				{#if errors.form}
					<p class="text-red-400 text-[10px] font-black uppercase text-center tracking-widest">{errors.form}</p>
				{/if}

				<button
					type="submit"
					class="w-full py-5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-black text-xl italic tracking-widest text-white shadow-lg shadow-pink-500/20 hover:scale-[1.02] hover:shadow-pink-500/40 transition active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
					disabled={!isFormValid}
				>
					REGISTER
				</button>
			</form>

			<footer class="text-center">
				<p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
					Already established?
					<a href="/login" class="text-purple-400 hover:text-purple-300 transition-colors ml-1 underline decoration-2 underline-offset-4">SIGN IN</a>
				</p>
			</footer>
		</div>
	</div>
</div>