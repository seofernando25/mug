<script lang="ts">
	let { children, data } = $props();
</script>

<div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-mono">
	<header class="bg-gray-800 p-4 shadow-md !fixed !top-0 !left-0 !right-0 !z-10">
		<div class="container mx-auto flex justify-between items-center">
			<a href="/about" class="text-gray-300 hover:text-purple-300">About</a>
		</div>
	</header>

	<main class="">
		{@render children()}
	</main>
</div>
