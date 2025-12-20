<script lang="ts">
	let { 
		checked = $bindable(false), 
		label = "", 
		id = Math.random().toString(36).substring(7),
		color = "purple" // 'purple', 'cyan', 'pink', 'yellow'
	} = $props();

	const colorClasses = {
		purple: "peer-checked:bg-purple-600 peer-focus:ring-purple-500 shadow-purple-500/20",
		cyan: "peer-checked:bg-cyan-500 peer-focus:ring-cyan-400 shadow-cyan-500/20",
		pink: "peer-checked:bg-pink-600 peer-focus:ring-pink-500 shadow-pink-500/20",
		yellow: "peer-checked:bg-yellow-500 peer-focus:ring-yellow-400 shadow-yellow-500/20"
	};

	const thumbColors = {
		purple: "bg-white",
		cyan: "bg-white",
		pink: "bg-white",
		yellow: "bg-white"
	};
</script>

<label class="inline-flex items-center cursor-pointer group" for={id}>
	<div class="relative">
		<!-- Hidden checkbox for accessibility -->
		<input 
			type="checkbox" 
			{id} 
			bind:checked 
			class="sr-only peer"
		/>
		
		<!-- Slider Track -->
		<div class="w-14 h-7 bg-gray-800 border border-white/5 rounded-full transition-all duration-300 peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-gray-900 
			{colorClasses[color as keyof typeof colorClasses]}
			peer-checked:shadow-[0_0_15px_rgba(0,0,0,0.5)]"
		></div>
		
		<!-- Slider Thumb -->
		<div class="absolute left-1 top-1 w-5 h-5 bg-gray-400 rounded-full transition-all duration-300 
			peer-checked:translate-x-7 peer-checked:bg-white peer-checked:scale-110
			group-hover:scale-105 shadow-lg">
		</div>
	</div>
	
	{#if label}
		<span class="ml-4 text-sm font-bold uppercase tracking-widest text-gray-400 group-hover:text-gray-200 transition-colors">
			{label}
		</span>
	{/if}
</label>
