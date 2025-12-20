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
	import { fade, fly } from 'svelte/transition';
	import Toggle from '$lib/components/Toggle.svelte';

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
</script>

<svelte:head>
	<title>Config - MUG</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-12 pb-12" in:fade={{ duration: 300 }}>
	<!-- Header -->
	<header class="text-left space-y-2">
		<h1 class="text-7xl font-black italic tracking-tighter text-white drop-shadow-2xl">
			CONFIG<span class="text-purple-500">.</span>
		</h1>
		<p class="text-gray-400 font-bold uppercase tracking-[0.3em] text-sm ml-1">
			System Preferences & Calibrations
		</p>
	</header>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- General Settings -->
		<section
			class="p-8 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl space-y-6 shadow-xl"
			in:fly={{ y: 20, delay: 100, duration: 400 }}
		>
			<h2 class="text-xs font-black uppercase tracking-[0.4em] text-purple-400 leading-none mb-6">
				General
			</h2>

			<div class="space-y-8">
				<div class="flex flex-col gap-2">
					<Toggle bind:checked={$skipLogin} label="Skip Login" color="purple" />
					<span class="text-[10px] text-gray-500 font-bold uppercase ml-[4.5rem]"
						>Bypass landing screen on start</span
					>
				</div>

				<div class="flex flex-col gap-2">
					<Toggle bind:checked={$autoPlay} label="Auto-Play" color="yellow" />
					<span
						class="text-[10px] text-yellow-500/50 font-black uppercase tracking-widest ml-[4.5rem]"
						>Debug Mode enabled</span
					>
				</div>
			</div>
		</section>

		<!-- Visual Settings -->
		<section
			class="p-8 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl space-y-6 shadow-xl"
			in:fly={{ y: 20, delay: 200, duration: 400 }}
		>
			<h2 class="text-xs font-black uppercase tracking-[0.4em] text-cyan-400 leading-none mb-6">
				Visuals
			</h2>

			<div class="space-y-8">
				<div class="flex flex-col gap-2">
					<Toggle bind:checked={$enableScreenPulse} label="Screen Pulse" color="cyan" />
					<span class="text-[10px] text-gray-500 font-bold uppercase ml-[4.5rem]"
						>Flash effects on note hits</span
					>
				</div>
			</div>
		</section>

		<!-- Audio Settings -->
		<section
			class="p-8 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl space-y-8 shadow-xl md:col-span-2"
			in:fly={{ y: 20, delay: 300, duration: 400 }}
		>
			<h2 class="text-xs font-black uppercase tracking-[0.4em] text-pink-400 leading-none">
				Audio Engine
			</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-12 mt-4">
				<div class="space-y-4">
					<div class="flex justify-between items-end">
						<label
							for="masterVolume"
							class="text-[10px] font-black uppercase tracking-widest text-gray-400"
							>Master Volume</label
						>
						<span class="text-2xl font-black italic text-white tabular-nums leading-none">
							{Math.round($masterVolume * 100)}<span class="text-xs not-italic text-pink-500 ml-0.5"
								>%</span
							>
						</span>
					</div>
					<input
						type="range"
						id="masterVolume"
						bind:value={$masterVolume}
						min="0"
						max="1"
						step="0.01"
						class="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-all"
					/>
				</div>

				<div class="space-y-4">
					<div class="flex justify-between items-end">
						<label
							for="musicVolume"
							class="text-[10px] font-black uppercase tracking-widest text-gray-400"
							>Music Volume</label
						>
						<span class="text-2xl font-black italic text-white tabular-nums leading-none">
							{Math.round($musicVolume * 100)}<span class="text-xs not-italic text-pink-500 ml-0.5"
								>%</span
							>
						</span>
					</div>
					<input
						type="range"
						id="musicVolume"
						bind:value={$musicVolume}
						min="0"
						max="1"
						step="0.01"
						class="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-all"
					/>
				</div>
			</div>
		</section>
	</div>

	<!-- Navigation -->
	<div class="flex justify-center pt-8">
		<button
			onclick={() => goto('/home')}
			class="group px-12 py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-black text-xl italic tracking-widest text-white shadow-lg shadow-pink-500/20 hover:scale-105 hover:shadow-pink-500/40 transition active:scale-95 flex items-center gap-4"
		>
			SAVE & EXIT
			<span
				class="text-sm not-italic opacity-50 font-bold group-hover:translate-x-1 transition-transform"
				>ESC</span
			>
		</button>
	</div>
</div>
