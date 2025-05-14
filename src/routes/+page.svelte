<script lang="ts">
	import { goto } from '$app/navigation';
	import { username as usernameStore } from '$lib/stores/userStore';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { quintOut } from 'svelte/easing';

	function stretchIn(
		node: HTMLElement,
		{ delay = 0, duration = 300, easing = quintOut, startScaleX = 3.0, startScaleY = 0.8 }
	) {
		const style = getComputedStyle(node);
		const original_transform = style.transform === 'none' ? '' : style.transform;

		return {
			delay,
			duration,
			easing,
			css: (t: number, u: number) => {
				const currentScaleX = u * startScaleX + t * 1.0;
				const currentScaleY = u * startScaleY + t * 1.0;
				const currentOpacity = t;

				return `
					transform: ${original_transform} scaleX(${currentScaleX}) scaleY(${currentScaleY});
					transform-origin: center center;
					opacity: ${currentOpacity};
				`;
			}
		};
	}

	let usernameInput = $state('');
	let showPanel = $state(false);

	onMount(() => {
		showPanel = true;
	});

	function join() {
		let finalUsername = usernameInput.trim();
		if (!finalUsername) {
			const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
			finalUsername = `GUEST-${randomId}`;
		}
		usernameStore.set(finalUsername);
		goto('/home');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			join();
		}
	}
</script>

<svelte:head>
	<title>Login - MUG</title>
</svelte:head>

{#if showPanel}
	<div
		in:stretchIn={{ startScaleX: 4.0, startScaleY: 0.1 }}
		out:fade={{ duration: 150 }}
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
				class="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-purple-400 focus:border-purple-400 block w-full p-2.5 mb-4"
				placeholder="Leave empty for guest access"
				bind:value={usernameInput}
				onkeydown={handleKeydown}
			/>
		</div>
		<button
			class="w-full bg-purple-400 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition"
			type="button"
			onclick={join}
		>
			JOIN
		</button>
	</div>
{/if}
