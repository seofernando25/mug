<script lang="ts">
interface Chart {
	coverUrl?: string;
	name?: string;
	artist?: string;
	difficulty?: string;
}

interface Props {
	currentChart?: Chart | null;
	isHost: boolean;
	openSongSelect: () => void;
}

const { currentChart, isHost, openSongSelect }: Props = $props();

function handleClick() {
	if (isHost) {
		openSongSelect();
	}
}
</script>

<div class="w-full">
	<div class="flex items-center justify-between mb-2">
		<h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Up Next</h3>
	</div>

	<button
		class="w-full h-28 relative rounded-lg overflow-hidden border border-white/10 group text-left transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-900/20"
		onclick={handleClick}
		class:cursor-default={!isHost}
		class:cursor-pointer={isHost}
	>
		<!-- Background -->
		{#if currentChart?.coverUrl}
			<div 
				class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
				style:background-image="url({currentChart.coverUrl})"
			></div>
			<div class="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/60 to-transparent"></div>
		{:else}
			<div class="absolute inset-0 bg-gray-800 flex items-center justify-center">
				<span class="text-4xl opacity-20">🎵</span>
			</div>
		{/if}

		<!-- Content -->
		<div class="relative z-10 p-4 h-full flex flex-col justify-center">
			{#if currentChart}
				<div class="flex items-start justify-between w-full">
					<div class="max-w-[70%]">
						<h2 class="text-xl font-black italic text-white tracking-tight leading-none drop-shadow-md truncate">{currentChart.name}</h2>
						<p class="text-sm font-medium text-gray-300 truncate mt-1">{currentChart.artist}</p>
						
						<div class="mt-3 flex items-center gap-2">
							<span class="text-[10px] font-bold bg-white/10 text-white px-2 py-0.5 rounded uppercase tracking-wider">
								{currentChart.difficulty || "Normal"}
							</span>
							<span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
								Mapped by Community
							</span>
						</div>
					</div>
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center w-full h-full text-gray-500">
					<span class="text-sm font-bold uppercase tracking-widest">{isHost ? 'Select a song to play' : 'Waiting for host...'}</span>
				</div>
			{/if}
		</div>
	</button>
</div>