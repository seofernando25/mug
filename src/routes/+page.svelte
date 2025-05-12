<svelte:head>
	<title>Login - MUG</title>
</svelte:head>

<div class="flex flex-col items-center justify-center h-full">
	<h1 class="text-4xl font-bold mb-8 text-purple-400">Welcome to MUG</h1>
	<div class="w-full max-w-xs">
		<label for="username" class="block text-sm font-medium text-gray-300 mb-2">Enter your name:</label>
		<input type="text" id="username" class="bg-gray-700 border border-gray-600 text-gray-100 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5 mb-4" placeholder="GamerTag">
		<button class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button">
			JOIN
		</button>
	</div>
</div>
