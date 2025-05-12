<script lang="ts">
	import '../app.css';
	
	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
	<header class="bg-gray-800 p-4 shadow-md">
		<div class="container mx-auto flex justify-between items-center">
			<a href="/home" class="text-xl font-bold text-purple-400 hover:text-purple-300">MUG Rhythm</a>
			<div>
				<!-- Placeholder for username -->
			</div>
		</div>
	</header>

	<main class="flex-grow container mx-auto p-4">
		<slot />
	</main>

	<footer class="bg-gray-800 p-2 text-center text-xs text-gray-500">
		MUG MVP
	</footer>
</div>
