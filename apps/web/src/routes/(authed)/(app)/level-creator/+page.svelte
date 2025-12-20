<script lang="ts">
	import Waves from '$lib/components/Waves.svelte';
	import ImportLevel from '$lib/components/ImportLevel.svelte';
</script>

<svelte:head>
	<title>Level Creator - MUG</title>
</svelte:head>

<div class="relative min-h-full w-full overflow-hidden">
	<div class="fixed inset-0 z-0">
		<Waves />
	</div>

	<div class="relative z-10 container mx-auto p-8 pb-32">
		<div class="w-full max-w-5xl mx-auto">
			<h1
				class="text-5xl font-black italic tracking-tighter mb-12 text-white text-center drop-shadow-lg"
			>
				Level <span class="text-purple-400">Creator</span>
			</h1>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<a
					href="/level-creator/create"
					class="group relative flex flex-col justify-between h-64 p-8 rounded-2xl bg-gray-900/60 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-gray-800/80 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 overflow-hidden"
				>
					<div
						class="absolute top-0 right-0 p-32 bg-purple-600/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-purple-600/20"
					></div>

					<div class="relative z-10">
						<div
							class="w-14 h-14 mb-6 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:text-white group-hover:bg-purple-500 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="w-8 h-8"
							>
								<path
									fill-rule="evenodd"
									d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<h2
							class="text-3xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors"
						>
							Create New
						</h2>
						<p class="text-gray-400 group-hover:text-gray-300">
							Start from scratch with your own audio file.
						</p>
					</div>

					<div
						class="relative z-10 flex items-center text-sm font-bold text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0"
					>
						OPEN EDITOR <span class="ml-2">→</span>
					</div>
				</a>

				<ImportLevel />
			</div>
		</div>
	</div>
</div>
