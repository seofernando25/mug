<script lang="ts">
	import Waves from '../home/Waves.svelte';
	import ImportLevel from '$lib/components/ImportLevel.svelte';
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>Level Creator - MUG</title>
</svelte:head>

<div class="flex flex-col h-full pt-8 isolate">
	<div class="fixed top-0 left-0 w-screen h-screen z-[-1] overflow-visible">
		<Waves />
	</div>

	<div class="w-full max-w-4xl mx-auto px-4">
		<h1 class="text-4xl font-bold mb-10 text-gray-200 text-center">Level Creator</h1>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Create Custom Level Button -->
			<button
				class="group block bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-y-2"
				on:click={() => goto('/level-creator/create')}
			>
				<h2
					class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors flex items-center"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 512 512"
						class="w-8 h-8 mr-3"
						fill="currentColor"
					>
						<path
							d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"
						/>
					</svg>
					Create Custom Level
				</h2>
				<p class="text-md text-indigo-100">Design your own rhythm game level from scratch</p>
			</button>

			<!-- Import Level Section (Now a component) -->
			<ImportLevel />
		</div>
	</div>
</div>
