<script lang="ts">
	// Placeholder for chat functionality
	let message = $state('');
</script>

<div class="h-full flex flex-col bg-gray-900/50 border-l border-white/5 backdrop-blur-sm">
	<!-- Chat Header -->
	<div class="p-3 border-b border-white/5 bg-gray-900/50">
		<h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Chat</h3>
	</div>

	<!-- Messages Area -->
	<div class="flex-1 p-4 overflow-y-auto space-y-2">
		<div class="text-xs text-gray-500 italic text-center mt-4">Welcome to the chat!</div>
		<!-- Mock Messages -->
		<!-- <div class="text-xs">
			<span class="font-bold text-cyan-400">User:</span>
			<span class="text-gray-300">Hello world!</span>
		</div> -->
	</div>

	<!-- Input Area -->
	<div class="p-3 bg-gray-900/80 border-t border-white/5">
		<input
			type="text"
			bind:value={message}
			placeholder="Type message..."
			class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:ring-1 focus:ring-purple-500 outline-none placeholder-gray-600 transition-colors"
		/>
	</div>
</div>
