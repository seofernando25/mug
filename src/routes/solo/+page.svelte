<script lang="ts">
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
</script>

<svelte:head>
	<title>Solo - Song Select - MUG</title>
</svelte:head>

<div>
	<h1 class="text-3xl font-bold mb-6">Select Song</h1>
	<div class="space-y-3 max-w-xl">
		<!-- Hardcoded link for the MVP test song -->
		<a
			href="/solo/play/test-song-1"
			class="block bg-gray-700 hover:bg-gray-600 p-4 rounded-md shadow transition-colors duration-150 ease-in-out"
		>
			<h2 class="text-xl font-semibold text-purple-300">Lesson by DJ</h2>
			<p class="text-sm text-gray-400">U.T.D & Friends</p>
		</a>

		<!-- Placeholder for more songs -->
		<div class="block bg-gray-800 p-4 rounded-md shadow opacity-50">
			<h2 class="text-xl font-semibold text-gray-500">More Songs Coming Soon...</h2>
			<p class="text-sm text-gray-600">...</p>
		</div>
	</div>
	<!-- TODO: Placeholder for leaderboard display -->
</div>
