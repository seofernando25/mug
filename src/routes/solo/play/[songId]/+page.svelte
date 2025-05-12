<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	// TODO: Initialize PixiJS here in onMount
</script>

<svelte:head>
	<title>Playing {data.songId} - MUG</title>
</svelte:head>

<div>
	<h1 class="text-2xl font-bold mb-4">Gameplay Screen</h1>
	<p class="mb-2">Now Playing: <span class="font-mono text-purple-300">{data.songId}</span></p>
	<div id="pixi-canvas-container" class="aspect-video bg-gray-700 border border-gray-600 rounded shadow-inner">
		<!-- PixiJS canvas will be appended here -->
		<p class="p-4 text-center text-gray-400">Gameplay Area</p>
	</div>
	<!-- Placeholder for score, combo, etc. -->
</div> 