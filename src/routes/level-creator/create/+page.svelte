<script lang="ts">
	import { onMount } from 'svelte';

	let musicFile: File | null = $state(null);
	let musicErrorMessage = $state<string | null>(null);
	let musicFileInput: HTMLInputElement;
	let isMusicDragging = $state(false);
	let musicFileReady = $state(false);
	let audioUrl: string | null = $state(null);

	function handleMusicDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isMusicDragging = true;
	}

	function handleMusicDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isMusicDragging = false;
	}

	function handleMusicDrop(e: DragEvent) {
		e.preventDefault();	
		e.stopPropagation();
		isMusicDragging = false;
		musicErrorMessage = null;

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		if (!file.type.startsWith('audio/')) {
			musicErrorMessage = 'Please drop a valid audio file';
			return;
		}

		musicFile = file;
		prepareMusicFile(file);
	}

	function handleMusicFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const file = input.files[0];
		if (!file.type.startsWith('audio/')) {
			musicErrorMessage = 'Please select a valid audio file';
			return;
		}

		musicFile = file;
		prepareMusicFile(file);
	}

	function triggerMusicFileInput() {
		musicFileInput.click();
	}

	function prepareMusicFile(file: File) {
		if (audioUrl) {
			URL.revokeObjectURL(audioUrl); // Clean up previous URL
		}
		audioUrl = URL.createObjectURL(file);
		musicFileReady = true;
	}

	// Clean up the object URL when the component is destroyed
	onMount(() => {
		return () => {
			if (audioUrl) {
				URL.revokeObjectURL(audioUrl);
			}
		};
	});
</script>

<svelte:head>
	<title>Create New Level - MUG</title>
</svelte:head>

<div class="flex flex-col h-full pt-8 isolate">
	<div class="w-full max-w-4xl mx-auto px-4">
		<h1 class="text-4xl font-bold mb-10 text-gray-200 text-center">Create New Level</h1>

		<div class="grid grid-cols-1 gap-6">

			{#if !musicFileReady}
			<!-- Upload Music Section -->
			<div
				class="group block bg-gradient-to-r from-green-500 to-teal-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out"
			>
				<h2 class="text-3xl font-bold text-white mb-1 group-hover:text-green-200 transition-colors flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 512 512"
						class="w-8 h-8 mr-3"
						fill="currentColor"
					>
						<path d="M464 256A208 208 0 1 0 256 464a208 208 0 1 0 0-416zm0 256A256 256 0 1 1 256 0a256 256 0 1 1 0 512zM256 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm96 96V352c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32 14.3 32 32zM192 192v128h96V192H192z"/></svg>
					Upload Music
				</h2>
				<p class="text-md text-teal-100 mb-4">Upload an audio file for your custom level</p>

				<input
					type="file"
					accept="audio/*"
					class="hidden"
					bind:this={musicFileInput}
					on:change={handleMusicFileSelect}
				/>

				<div
					class="border-2 border-dashed border-white/30 rounded-lg p-8 text-center transition-colors cursor-pointer {isMusicDragging
						? 'border-green-200 bg-green-500/20'
						: 'hover:border-green-200'}"
					on:dragover={handleMusicDragOver}
					on:dragleave={handleMusicDragLeave}
					on:drop={handleMusicDrop}
					on:click={triggerMusicFileInput}
				>
					{#if !musicFile}
						<p class="text-white/80">
							Drag and drop your music file here<br />
							or click to select a file
						</p>
					{:else}
						<p class="text-white/80">
							File loaded: {musicFile.name}
						</p>
					{/if}
				</div>

				{#if musicErrorMessage}
					<p class="text-red-200 mt-2 text-sm">{musicErrorMessage}</p>
				{/if}
			</div>
			{:else}
			<!-- Music Player Section -->
			<div
				class="group block bg-gradient-to-r from-blue-500 to-purple-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out"
			>
				<h2 class="text-3xl font-bold text-white mb-4 flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-8 h-8 mr-3" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24v80c0 13.3 10.7 24 24 24h0c13.3 0 24-10.7 24-24V288h8c13.3 0 24-10.7 24-24V224c0-13.3-10.7-24-24-24H280V160c0-13.3-10.7-24-24-24h0c-13.3 0-24 10.7-24 24v48h-8c-13.3 0-24 10.7-24 24v32c0 13.3 10.7 24 24 24zm80-80V192h32v64H296zm-80 0v-32h32v32h-32z"/></svg>
					Now Playing: {musicFile?.name}
				</h2>
				{#if audioUrl}
					<audio controls src="{audioUrl}" class="w-full"></audio>
				{/if}
			</div>

			<!-- Level Editor Track Section Placeholder -->
			<div
				class="group block bg-gradient-to-r from-orange-500 to-red-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out mt-6 h-170 overflow-y-auto"
			>
				<h2 class="text-3xl font-bold text-white mb-4 flex items-center">
					Level Editor Track (Coming Soon)
				</h2>
				<p class="text-md text-red-100">This section will contain the level editing interface.</p>

				<!-- PixiJS Canvas will be appended here -->
			</div>

			{/if}

		</div>
		<!-- You can add more sections here -->
	</div>

</div> 