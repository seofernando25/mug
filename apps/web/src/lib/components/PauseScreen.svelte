<script lang="ts">
	import { masterVolume, musicVolume } from '$lib/stores/settingsStore';
	import { fade, fly, scale } from 'svelte/transition';

	const {
		onResume = () => {},
		onRetry = () => {},
		onExit = () => {}
	}: {
		onResume?: () => void;
		onRetry?: () => void;
		onExit?: () => void;
	} = $props();
</script>

<div
	class="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-900/90 backdrop-blur-md text-white font-sans"
	transition:fade={{ duration: 200 }}
>
	<div
		class="w-[500px] max-w-[95vw] flex flex-col gap-8"
		transition:scale={{ start: 0.95, duration: 200 }}
	>
		<!-- Header -->
		<div class="text-center">
			<h1 class="text-6xl font-black italic tracking-tighter text-white drop-shadow-xl mb-2">
				PAUSED
			</h1>
			<div class="h-1 w-24 bg-gradient-to-r from-purple-500 to-cyan-500 mx-auto rounded-full"></div>
		</div>

		<!-- Audio Settings -->
		<div class="bg-black/40 border border-white/10 rounded-2xl p-6 space-y-6 backdrop-blur-sm">
			<h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Audio Settings</h3>

			<div class="space-y-4">
				<div class="space-y-2">
					<div class="flex justify-between items-center text-sm font-bold">
						<span class="text-gray-300">Master Volume</span>
						<span class="text-cyan-400">{Math.round($masterVolume * 100)}%</span>
					</div>
					<input
						type="range"
						bind:value={$masterVolume}
						min="0"
						max="1"
						step="0.01"
						class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
					/>
				</div>

				<div class="space-y-2">
					<div class="flex justify-between items-center text-sm font-bold">
						<span class="text-gray-300">Music Volume</span>
						<span class="text-cyan-400">{Math.round($musicVolume * 100)}%</span>
					</div>
					<input
						type="range"
						bind:value={$musicVolume}
						min="0"
						max="1"
						step="0.01"
						class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
					/>
				</div>
			</div>
		</div>

		<!-- Buttons -->
		<div class="flex flex-col gap-3">
			<button
				onclick={onResume}
				class="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-black text-2xl italic tracking-widest text-white shadow-lg shadow-pink-500/20 hover:scale-[1.02] hover:shadow-pink-500/40 transition active:scale-[0.98]"
			>
				RESUME
			</button>

			<div class="grid grid-cols-2 gap-3">
				<button
					onclick={onRetry}
					class="py-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-xl font-bold uppercase tracking-widest transition hover:scale-[1.02]"
				>
					Retry
				</button>

				<button
					onclick={onExit}
					class="py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-bold uppercase tracking-widest transition hover:scale-[1.02]"
				>
					Exit
				</button>
			</div>
		</div>
	</div>
</div>
