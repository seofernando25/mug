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
		<a
			href="/solo"
			class="group block bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-x-4"
		>
			<h2
				class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors flex items-center"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 448 512"
					class="w-8 h-8 mr-3"
					fill="currentColor"
					><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
						d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z"
					/></svg
				>
				SOLO
			</h2>
			<p class="text-md text-indigo-100">Challenge yourself and climb the ranks</p>
		</a>

		<!-- MULTIPLAYER Button -->
		<a
			href="/multiplayer"
			class="group block bg-gradient-to-r from-red-600 to-pink-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-x-4"
		>
			<h2
				class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors flex items-center"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 640 512"
					class="w-8 h-8 mr-3"
					fill="currentColor"
					><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
						d="M144 0a80 80 0 1 1 0 160A80 80 0 1 1 144 0zM512 0a80 80 0 1 1 0 160A80 80 0 1 1 512 0zM0 298.7C0 239.8 47.8 192 106.7 192l42.7 0c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96c-.2 0-.4 0-.7 0L21.3 320C9.6 320 0 310.4 0 298.7zM405.3 320c-.2 0-.4 0-.7 0c26.6-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7l42.7 0C592.2 192 640 239.8 640 298.7c0 11.8-9.6 21.3-21.3 21.3l-213.3 0zM224 224a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zM128 485.3C128 411.7 187.7 352 261.3 352l117.3 0C452.3 352 512 411.7 512 485.3c0 14.7-11.9 26.7-26.7 26.7l-330.7 0c-14.7 0-26.7-11.9-26.7-26.7z"
					/></svg
				>
				MULTIPLAYER
			</h2>
			<p class="text-md text-pink-100">Play online with others (Coming Soon)</p>
		</a>

		<!-- LEVEL CREATOR Button -->
		<a
			href="/level-creator"
			class="group block bg-gradient-to-r from-yellow-500 to-amber-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-x-4"
		>
			<h2
				class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors flex items-center"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 512 512"
					class="w-8 h-8 mr-3"
					fill="currentColor"
					><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
						d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160V416c0 53 43 96 96 96H352c53 0 96-43 96-96V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H96z"
					/></svg
				>
				LEVEL CREATOR
			</h2>
			<p class="text-md text-amber-100">Create and share your own levels</p>
		</a>

		<!-- CONFIG Button -->
		<a
			href="/config"
			class="group block bg-gradient-to-r from-blue-600 to-cyan-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-x-4"
		>
			<h2
				class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors flex items-center"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 512 512"
					class="w-8 h-8 mr-3"
					fill="currentColor"
					><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
						d="M352 320c88.4 0 160-71.6 160-160c0-15.3-2.2-30.1-6.2-44.2c-3.1-10.8-16.4-13.2-24.3-5.3l-76.8 76.8c-3 3-7.1 4.7-11.3 4.7L336 192c-8.8 0-16-7.2-16-16l0-57.4c0-4.2 1.7-8.3 4.7-11.3l76.8-76.8c7.9-7.9 5.4-21.2-5.3-24.3C382.1 2.2 367.3 0 352 0C263.6 0 192 71.6 192 160c0 19.1 3.4 37.5 9.5 54.5L19.9 396.1C7.2 408.8 0 426.1 0 444.1C0 481.6 30.4 512 67.9 512c18 0 35.3-7.2 48-19.9L297.5 310.5c17 6.2 35.4 9.5 54.5 9.5zM80 408a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"
					/></svg
				>
				CONFIG
			</h2>
			<p class="text-md text-cyan-100">Adjust your gameplay settings</p>
		</a>

		<!-- ABOUT Button -->
		<a
			href="/about"
			class="group block bg-gradient-to-r from-green-600 to-teal-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-x-4"
		>
			<h2
				class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors flex items-center"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 192 512"
					class="w-8 h-8 mr-3"
					fill="currentColor"
					><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path
						d="M48 80a48 48 0 1 1 96 0A48 48 0 1 1 48 80zM0 224c0-17.7 14.3-32 32-32l64 0c17.7 0 32 14.3 32 32l0 224 32 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 512c-17.7 0-32-14.3-32-32s14.3-32 32-32l32 0 0-192-32 0c-17.7 0-32-14.3-32-32z"
					/></svg
				>
				ABOUT
			</h2>
			<p class="text-md text-teal-100">Learn more about the project</p>
		</a>
	</div>
</div>
