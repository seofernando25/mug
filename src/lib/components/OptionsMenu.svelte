<script lang="ts">
	import { isPaused, masterVolume, musicVolume } from '$lib/stores/settingsStore';

	let { showMenu = false, closeMenu = () => {} } = $props();

	function closeMenu() {
		isPaused.set(false);
	}
</script>

{#if showMenu}
	<!-- Close on backdrop click -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
		on:click|self={closeMenu}
		on:keydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') closeMenu();
			// Also allow Escape key to close the options menu, which is a common pattern for modals
			if (event.key === 'Escape') closeMenu(); 
		}}
		tabindex="0"
		role="button" 
		aria-label="Close options menu by clicking outside or pressing Escape, Enter, or Space"
	>
		<div 
            class="bg-gray-800 text-white p-8 rounded-lg shadow-xl w-full max-w-md"
            on:click|stopPropagation // Prevent click inside from closing
        >
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-2xl font-semibold">Options</h2>
				<button
					on:click={closeMenu}
					class="text-gray-400 hover:text-white text-2xl"
					aria-label="Close options menu"
				>
					&times;
				</button>
			</div>

			<!-- Audio Settings -->
			<section class="mb-6">
				<h3 class="text-xl font-medium mb-3 border-b border-gray-700 pb-2">Audio</h3>
				<div class="flex items-center justify-between mb-2">
					<label for="masterVolume" class="text-gray-300">Master Volume</label>
					<span class="text-sm text-gray-400">{Math.round($masterVolume * 100)}%</span>
				</div>
				<input
					type="range"
					id="masterVolume"
					min="0"
					max="1"
					step="0.01"
					bind:value={$masterVolume}
					class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-4"
				/>

				<div class="flex items-center justify-between mb-2">
					<label for="musicVolume" class="text-gray-300">Music Volume</label>
					<span class="text-sm text-gray-400">{Math.round($musicVolume * 100)}%</span>
				</div>
				<input
					type="range"
					id="musicVolume"
					min="0"
					max="1"
					step="0.01"
					bind:value={$musicVolume}
					class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
				/>
			</section>

			<!-- Placeholder for Gameplay Settings -->
			<section class="mb-6">
				<h3 class="text-xl font-medium mb-3 border-b border-gray-700 pb-2">Gameplay (Future)</h3>
				<p class="text-gray-500 text-sm">Keybindings, note speed adjustments, etc.</p>
			</section>

			<!-- Placeholder for Graphics Settings -->
			<section>
				<h3 class="text-xl font-medium mb-3 border-b border-gray-700 pb-2">Graphics (Future)</h3>
				<p class="text-gray-500 text-sm">Background dim, visual effects, etc.</p>
			</section>

			<div class="mt-8 text-right">
				<button
					on:click={closeMenu}
					class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Ensure the slider thumb is visible and styled */
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		background: #3b82f6; /* Same as accent-blue-500 */
		cursor: pointer;
		border-radius: 50%;
	}

	input[type='range']::-moz-range-thumb {
		width: 20px;
		height: 20px;
		background: #3b82f6;
		cursor: pointer;
		border-radius: 50%;
		border: none;
	}
</style>
