<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import { ArkErrors } from 'arktype';
	import { onMount } from 'svelte';
	import { RegisterFormSchema, type RegisterFormData } from './schema';

	let formData = $state<RegisterFormData>({
		username: '',
		email: '',
		password: ''
	});

	// References to DOM elements
	let usernameInputElement = $state<HTMLInputElement | undefined>();
	let emailInputElement = $state<HTMLInputElement | undefined>();

	onMount(() => {
		const urlUsername = page.url.searchParams.get('username');
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
	let lastCheckedUsername = '';
	const unavailableUsernames = new Set<string>();
	let asyncUsernameError = '';

	$effect(() => {
		if (formData.username && formData.username !== lastCheckedUsername) {
			if (unavailableUsernames.has(formData.username)) {
				asyncUsernameError = 'Username is already taken';
				return;
			}
			if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
			usernameCheckTimeout = setTimeout(async () => {
				try {
					const res = await fetch(
						`/api/check-username?username=${encodeURIComponent(formData.username)}`
					);
					const data = await res.json();
					lastCheckedUsername = formData.username;
					if (data.exists) {
						unavailableUsernames.add(formData.username);
						asyncUsernameError = 'Username is already taken';
					} else if (asyncUsernameError === 'Username is already taken') {
						asyncUsernameError = '';
					}
				} catch (e) {
					// Optionally handle network/API errors
				}
			}, 400); // 400ms debounce
		} else if (!formData.username) {
			asyncUsernameError = '';
		}
	});

	let isFormValid = $state(false);

	$effect(() => {
		const result = RegisterFormSchema(formData);
		const currentErrors: { [key in keyof RegisterFormData | 'form']?: string } = {};
		let valid = true;
		if (result instanceof Array && result[0] && result[0].message) {
			// ArkType error array
			valid = false;
			result.forEach((problem) => {
				currentErrors[problem.path.join('.') as keyof RegisterFormData] = problem.message;
			});
		}
		// Merge async username error, never overwrite it if present
		if (asyncUsernameError) {
			currentErrors.username = asyncUsernameError;
		}
		errors = currentErrors;
		isFormValid = valid && Object.keys(currentErrors).length === 0;
	});
</script>

<div
	class="flex flex-col items-center justify-center min-h-screen py-10 bg-gray-900 text-gray-100 font-mono"
>
	<div class="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-xl">
		<h1 class="text-3xl font-bold text-center text-purple-400">Create Account</h1>

		<form
			method="POST"
			use:enhance={async ({ cancel, formData, formElement, controller, submitter }) => {
				cancel(); // Never submit the form to server
				console.log('Form submitted');
				const entries = Object.fromEntries(formData.entries());

				const result = RegisterFormSchema(entries);

				if (result instanceof ArkErrors) {
					errors = result.reduce(
						(acc, p) => {
							acc[p.path.join('.')] = p.message;
							return acc;
						},
						{} as { [key: string]: string }
					);
					console.log(errors);
					return;
				}

				// Sign up with api
				const signUpResult = await authClient.signUp.email({
					email: result.email,
					password: result.password,
					username: result.username,
					name: result.username
				});
				if (signUpResult.error) {
					errors.form = signUpResult.error?.message || 'An unknown error occurred';
				}

				goto('/home');
			}}
		>
			<div class="mb-4">
				<label for="username" class="block text-sm font-medium text-gray-300 mb-1">Username</label>
				<input
					type="text"
					name="username"
					id="username"
					autocomplete="username"
					bind:value={formData.username}
					bind:this={usernameInputElement}
					class="block w-full px-3 py-2 bg-gray-700 border rounded-md shadow-sm placeholder-gray-500 focus:outline-none sm:text-sm transition-colors"
					class:border-gray-600={!errors.username}
					class:border-red-500={errors.username}
					class:focus:border-purple-500={!errors.username}
					class:focus:ring-purple-500={!errors.username}
					required
				/>
				{#if errors.username}
					<p class="text-red-500 text-xs mt-1">{errors.username}</p>
				{/if}
			</div>

			<div class="mb-4">
				<label for="email" class="block text-sm font-medium text-gray-300 mb-1">Email</label>
				<input
					type="email"
					name="email"
					id="email"
					autocomplete="email"
					bind:value={formData.email}
					bind:this={emailInputElement}
					class="block w-full px-3 py-2 bg-gray-700 border rounded-md shadow-sm placeholder-gray-500 focus:outline-none sm:text-sm transition-colors"
					class:border-gray-600={!errors.email}
					class:border-red-500={errors.email}
					class:focus:border-purple-500={!errors.email}
					class:focus:ring-purple-500={!errors.email}
					required
				/>
				{#if errors.email}
					<p class="text-red-500 text-xs mt-1">{errors.email}</p>
				{/if}
			</div>

			<div class="mb-6">
				<label for="password" class="block text-sm font-medium text-gray-300 mb-1">Password</label>
				<input
					type="password"
					name="password"
					id="password"
					autocomplete="new-password"
					bind:value={formData.password}
					class="block w-full px-3 py-2 bg-gray-700 border rounded-md shadow-sm placeholder-gray-500 focus:outline-none sm:text-sm transition-colors"
					class:border-gray-600={!errors.password}
					class:border-red-500={errors.password}
					class:focus:border-purple-500={!errors.password}
					class:focus:ring-purple-500={!errors.password}
					required
				/>
				{#if errors.password}
					<p class="text-red-500 text-xs mt-1">{errors.password}</p>
				{/if}
			</div>

			<!-- General form error from server (e.g. unexpected error or form-level error) -->
			{#if errors.form}
				<p class="text-red-500 text-sm text-center mb-4">{errors.form}</p>
			{/if}

			<button
				type="submit"
				class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors"
				class:bg-purple-600={isFormValid}
				class:bg-gray-500={!isFormValid}
				class:hover:bg-purple-700={isFormValid}
				class:focus:outline-none={isFormValid}
				class:focus:ring-2={isFormValid}
				class:focus:ring-offset-2={isFormValid}
				class:focus:ring-purple-500={isFormValid}
				class:focus:ring-offset-gray-800={isFormValid}
				disabled={!isFormValid}
			>
				Register
			</button>
		</form>
		<p class="mt-6 text-center text-sm text-gray-400">
			Already have an account?
			<a href="/login" class="font-medium text-purple-400 hover:text-purple-300">Sign in</a>
		</p>
	</div>
</div>
