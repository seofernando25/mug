<script lang="ts">
	import { slide } from 'svelte/transition';

	let isPlayerVisible = false;
	// Placeholder for actual track data later
	let trackName = 'Eternal Bliss';
	let artistName = 'Emiru no Aishita Tsukiyo ni Dai San Gensou Kyoku wo';
	let progress = 30; // Percentage for the progress bar

	function togglePlayer() {
		isPlayerVisible = !isPlayerVisible;
	}

	function closePlayer() {
		isPlayerVisible = false;
	}

	function clickOutside(node: HTMLElement, callback: () => void) {
		const handleClick = (event: MouseEvent) => {
			// Check if the player is visible and the click is outside the node and not on the toggle button itself
			// (We find the button by aria-label, a more robust way would be to pass the button element to the action too)
			const toggleButton = document.querySelector('[aria-label="Toggle music player"]');
			if (
				node &&
				!node.contains(event.target as Node) &&
				!(toggleButton && toggleButton.contains(event.target as Node)) &&
				isPlayerVisible
			) {
				callback();
			}
		};

		document.addEventListener('mousedown', handleClick, true);

		return {
			destroy() {
				document.removeEventListener('mousedown', handleClick, true);
			}
		};
	}
</script>

<div class="relative">
	<button
		on:click={togglePlayer}
		class="p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
		aria-label="Toggle music player"
	>
		<!-- Main Music Icon (from user's selection) -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 512 512"
			class="w-6 h-6 text-gray-300 hover:text-white"
			fill="currentColor"
		>
			<!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
			<path
				d="M499.1 6.3c8.1 6 12.9 15.6 12.9 25.7l0 72 0 264c0 44.2-43 80-96 80s-96-35.8-96-80s43-80 96-80c11.2 0 22 1.6 32 4.6L448 147 192 223.8 192 432c0 44.2-43 80-96 80s-96-35.8-96-80s43-80 96-80c11.2 0 22 1.6 32 4.6L128 200l0-72c0-14.1 9.3-26.6 22.8-30.7l320-96c9.7-2.9 20.2-1.1 28.3 5z"
			/>
		</svg>
	</button>

	{#if isPlayerVisible}
		<div
			use:clickOutside={closePlayer}
			transition:slide={{ duration: 200 }}
			class="absolute right-0 mt-2 w-[380px] bg-gray-800 bg-opacity-90 border border-gray-700 rounded-lg shadow-xl z-20 text-white overflow-hidden"
		>
			<div class="p-4 pb-3">
				<!-- Track Info -->
				<div class="text-center mb-3">
					<h3 class="text-xl font-semibold truncate" title={trackName}>{trackName}</h3>
					<p class="text-xs text-gray-400 truncate" title={artistName}>{artistName}</p>
				</div>

				<!-- Controls -->
				<div class="flex items-center justify-between">
					<!-- Shuffle Button (Left) -->
					<button class="p-2 hover:bg-gray-700 rounded-full">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 512 512"
							class="w-5 h-5 text-gray-300 hover:text-white"
							fill="currentColor"
						>
							<path
								d="M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6l0-32-32 0c-10.1 0-19.6 4.7-25.6 12.8L284 229.3 244 176l31.2-41.6C293.3 110.2 321.8 96 352 96l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6zM164 282.7L204 336l-31.2 41.6C154.7 401.8 126.2 416 96 416l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c10.1 0 19.6-4.7 25.6-12.8L164 282.7zm274.6 188c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6l0-32-32 0c-30.2 0-58.7-14.2-76.8-38.4L121.6 172.8c-6-8.1-15.5-12.8-25.6-12.8l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c30.2 0 58.7 14.2 76.8 38.4L326.4 339.2c6 8.1 15.5 12.8 25.6 12.8l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64z"
							/>
						</svg>
					</button>

					<!-- Centered Controls -->
					<div class="flex items-center space-x-3">
						<button class="p-2 hover:bg-gray-700 rounded-full">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 320 512"
								class="w-5 h-5 text-gray-300 hover:text-white transform scale-x-[-1]"
								fill="currentColor"
							>
								<path
									d="M52.5 440.6c-9.5 7.9-22.8 9.7-34.1 4.4S0 428.4 0 416L0 96C0 83.6 7.2 72.3 18.4 67s24.5-3.6 34.1 4.4l192 160L256 241l0-145c0-17.7 14.3-32 32-32s32 14.3 32 32l0 320c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-145-11.5 9.6-192 160z"
								/>
							</svg>
						</button>
						<button class="p-2 bg-gray-700 hover:bg-gray-600 rounded-full">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 384 512"
								class="w-6 h-6 text-white"
								fill="currentColor"
							>
								<path
									d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"
								/>
							</svg>
						</button>
						<button class="p-2 hover:bg-gray-700 rounded-full">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 320 512"
								class="w-5 h-5 text-gray-300 hover:text-white"
								fill="currentColor"
							>
								<path
									d="M52.5 440.6c-9.5 7.9-22.8 9.7-34.1 4.4S0 428.4 0 416L0 96C0 83.6 7.2 72.3 18.4 67s24.5-3.6 34.1 4.4l192 160L256 241l0-145c0-17.7 14.3-32 32-32s32 14.3 32 32l0 320c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-145-11.5 9.6-192 160z"
								/>
							</svg>
						</button>
					</div>

					<!-- Hamburger Menu (Right) -->
					<button class="p-2 hover:bg-gray-700 rounded-full">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 448 512"
							class="w-5 h-5 text-gray-300 hover:text-white"
							fill="currentColor"
						>
							<path
								d="M0 96C0 78.3 14.3 64 32 64l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 128C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 288c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32L32 448c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0c17.7 0 32 14.3 32 32z"
							/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="w-full bg-gray-600 h-1.5 rounded-b-lg overflow-hidden">
				<div class="bg-yellow-500 h-1.5" style="width: {progress}%;"></div>
			</div>
		</div>
	{/if}
</div>
