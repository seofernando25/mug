<script lang="ts">
	import {
		skipLogin,
		autoPlay,
		masterVolume,
		musicVolume,
		enableScreenPulse
	} from '$lib/stores/settingsStore';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				goto('/home');
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	// Helper for range input if needed, or direct bind
</script>

<svelte:head>
	<title>Configuration - MUG</title>
</svelte:head>

<div class="space-y-8 text-gray-100">
	<h1 class="text-3xl font-bold text-purple-400">Configuration</h1>

	<section class="space-y-4 p-6 bg-gray-800 rounded-lg shadow-md">
		<h2 class="text-2xl font-semibold text-purple-300 border-b border-gray-700 pb-2">
			General Settings
		</h2>
		<div class="flex items-center justify-between">
			<label for="skipLogin" class="text-lg">Skip Login Screen</label>
			<input
				type="checkbox"
				id="skipLogin"
				bind:checked={$skipLogin}
				class="form-checkbox h-6 w-6 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
			/>
		</div>
	</section>

	<section class="space-y-4 p-6 bg-gray-800 rounded-lg shadow-md">
		<h2 class="text-2xl font-semibold text-purple-300 border-b border-gray-700 pb-2">
			Visual Settings
		</h2>
		<div class="flex items-center justify-between">
			<label for="enableScreenPulse" class="text-lg">Enable Screen Pulse Effect</label>
			<input
				type="checkbox"
				id="enableScreenPulse"
				bind:checked={$enableScreenPulse}
				class="form-checkbox h-6 w-6 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
			/>
		</div>
	</section>

	<section class="space-y-4 p-6 bg-gray-800 rounded-lg shadow-md">
		<h2 class="text-2xl font-semibold text-purple-300 border-b border-gray-700 pb-2">
			Audio Settings
		</h2>
		<div class="space-y-3">
			<div>
				<label for="masterVolume" class="block text-lg mb-1"
					>Master Volume: {Math.round($masterVolume * 100)}%</label
				>
				<input
					type="range"
					id="masterVolume"
					bind:value={$masterVolume}
					min="0"
					max="1"
					step="0.01"
					class="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
				/>
			</div>
			<div>
				<label for="musicVolume" class="block text-lg mb-1"
					>Music Volume: {Math.round($musicVolume * 100)}%</label
				>
				<input
					type="range"
					id="musicVolume"
					bind:value={$musicVolume}
					min="0"
					max="1"
					step="0.01"
					class="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
				/>
			</div>
		</div>
	</section>

	<section class="space-y-4 p-6 bg-gray-800 rounded-lg shadow-md">
		<h2 class="text-2xl font-semibold text-purple-300 border-b border-gray-700 pb-2">
			Gameplay Debug
		</h2>
		<div class="flex items-center justify-between">
			<label for="autoPlay" class="text-lg">Enable Auto-Play (for testing)</label>
			<input
				type="checkbox"
				id="autoPlay"
				bind:checked={$autoPlay}
				class="form-checkbox h-6 w-6 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
			/>
		</div>
	</section>
</div>

<style lang="postcss">
	/* Ensure Tailwind forms plugin styles are applied if you're using it or add custom checkbox/range styles */
	/* For basic styling of range input track and thumb if not using a plugin: */
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		background: #a855f7; /* purple-500 */
		cursor: pointer;
		border-radius: 50%;
		margin-top: -6px; /* Adjust to center thumb on track */
	}

	input[type='range']::-moz-range-thumb {
		width: 20px;
		height: 20px;
		background: #a855f7; /* purple-500 */
		cursor: pointer;
		border-radius: 50%;
		border: none;
	}
</style>
