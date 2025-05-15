<script lang="ts">
	import Waves from './Waves.svelte';
</script>

<svelte:head>
	<title>Home - MUG</title>
</svelte:head>

<div class="flex flex-col h-full pt-8 isolate">
	<div class="fixed top-0 left-0 w-screen h-screen z-[-1] overflow-visible">
		<Waves />
	</div>
	<h1 class="text-4xl font-bold mb-10 text-gray-200 text-center">Select Mode</h1>
	<!-- Aligned to the right using ml-auto within the flex container -->
	<div class="w-full max-w-3xl space-y-5 ml-auto pr-4 md:pr-8 lg:pr-16">
		<!-- SOLO Button -->
		<a href="/solo" class="group block bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-x-4">
			<h2 class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors">SOLO</h2>
			<p class="text-md text-indigo-100">Challenge yourself and climb the ranks</p>
		</a>

		<!-- MULTIPLAYER Button -->
		<a href="/multiplayer" class="group block bg-gradient-to-r from-red-600 to-pink-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-x-4">
			<h2 class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors">MULTIPLAYER</h2>
			<p class="text-md text-pink-100">Play online with others (Coming Soon)</p>
		</a>

		<!-- CONFIG Button -->
		<a href="/config" class="group block bg-gradient-to-r from-blue-600 to-cyan-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-x-4">
			<h2 class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors">CONFIG</h2>
			<p class="text-md text-cyan-100">Adjust your gameplay settings</p>
		</a>

		<!-- ABOUT Button -->
		<a href="/about" class="group block bg-gradient-to-r from-green-600 to-teal-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-x-4">
			<h2 class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors">ABOUT</h2>
			<p class="text-md text-teal-100">Learn more about the project</p>
		</a>
	</div>

</div> 
