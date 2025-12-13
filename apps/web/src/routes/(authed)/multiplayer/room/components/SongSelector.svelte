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

let { currentChart, isHost, openSongSelect }: Props = $props();

function handleClick() {
	if (isHost) {
		openSongSelect();
	}
}
</script>

<div class="flex-1 flex flex-col items-center justify-center relative">
    <div class="relative w-[500px] h-[500px] flex items-center justify-center group">

        <div class="absolute inset-0 rounded-full border border-gray-700 opacity-50 scale-90"></div>
        <div class="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-[spin_10s_linear_infinite] opacity-30"></div>
        <div class="absolute inset-0 rounded-full border border-cyan-400/10 scale-110"></div>

        <button
            class="w-80 h-80 rounded-full bg-black border-4 border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative transition-transform duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
            onclick={handleClick}
            class:cursor-default={!isHost}
            class:cursor-pointer={isHost}
        >
            {#if currentChart?.coverUrl}
                <img src={currentChart.coverUrl} alt="Cover" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            {:else}
                <div class="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-600">
                    <span class="text-6xl mb-2">🎵</span>
                    <span class="text-sm font-bold uppercase tracking-widest">{isHost ? 'Select Song' : 'Host Selecting...'}</span>
                </div>
            {/if}

            {#if isHost}
                <div class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span class="font-bold text-cyan-400 tracking-widest border border-cyan-400 px-4 py-2 rounded-full">CHANGE SONG</span>
                </div>
            {/if}
        </button>

        <div class="absolute -bottom-16 text-center w-full">
            <h1 class="text-3xl font-black italic tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {currentChart?.name || 'NO SONG SELECTED'}
            </h1>
            <p class="text-cyan-400 font-bold uppercase tracking-widest text-sm mt-1">
                {currentChart?.artist || ''}
                {#if currentChart?.difficulty}
                    <span class="text-gray-500 mx-2">|</span> {currentChart.difficulty}
                {/if}
            </p>
        </div>
    </div>
</div>