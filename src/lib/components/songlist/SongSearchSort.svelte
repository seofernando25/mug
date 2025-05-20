<!-- src/lib/components/songlist/SongSearchSort.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let searchTerm = '';
	// Add other props for sort/filter if needed later

	const dispatch = createEventDispatcher();

	function updateSearchTerm(event: Event) {
		const target = event.target as HTMLInputElement;
		searchTerm = target.value;
		dispatch('search', searchTerm);
	}

	// Placeholder functions for other controls
	function sortByTitle() {
		console.log('Sort by Title');
		dispatch('sort', 'title');
	}
	function sortByArtist() {
		console.log('Sort by Artist');
		dispatch('sort', 'artist');
	}
	function sortByBPM() {
		console.log('Sort by BPM');
		dispatch('sort', 'bpm');
	}
	// ... other sort/filter functions
</script>

<div class="p-4 bg-gray-800 rounded-t-md">
	<input
		type="text"
		bind:value={searchTerm}
		on:input={updateSearchTerm}
		placeholder="Type to search..."
		class="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
	/>
	<div class="mt-3 flex space-x-2 text-sm">
		<span class="text-gray-400">Sort by:</span>
		<button on:click={sortByTitle} class="hover:text-purple-300 transition-colors">Title</button>
		<button on:click={sortByArtist} class="hover:text-purple-300 transition-colors">Artist</button>
		<button on:click={sortByBPM} class="hover:text-purple-300 transition-colors">BPM</button>
		<!-- Add more buttons for Date Submitted, Date Added, Date Ranked, Last Played, Difficulty -->
		<button class="hover:text-purple-300 transition-colors">Date Submitted</button>
		<button class="hover:text-purple-300 transition-colors">Date Added</button>
		<button class="hover:text-purple-300 transition-colors">Date Ranked</button>
		<button class="hover:text-purple-300 transition-colors">Last Played</button>
		<button class="hover:text-purple-300 transition-colors">Difficulty</button>
		<div class="flex-grow"></div>
		<!-- Pushes Show Converted to the right -->
		<label
			class="flex items-center space-x-1 hover:text-purple-300 transition-colors cursor-pointer"
		>
			<input
				type="checkbox"
				class="form-checkbox rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
			/>
			<span>Show converted</span>
		</label>
	</div>
</div>
