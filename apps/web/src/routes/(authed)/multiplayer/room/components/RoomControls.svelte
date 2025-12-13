<script lang="ts">
interface Props {
	handleLeaveRoom: () => void;
	isLeaving: boolean;
	isHost: boolean;
	startGame: () => void;
}

const { handleLeaveRoom, isLeaving, isHost, startGame }: Props = $props();
</script>

<div class="h-24 bg-gray-900/90 border-t border-gray-700 p-4 flex items-center justify-between backdrop-blur-md">

    <button
        onclick={handleLeaveRoom}
        disabled={isLeaving}
        class="px-6 py-3 rounded-lg font-bold text-red-400 hover:bg-red-900/30 hover:text-red-200 transition disabled:opacity-50"
    >
        {isLeaving ? 'LEAVING...' : 'LEAVE ROOM'}
    </button>

    <div class="flex items-center gap-4">
        {#if isHost}
            <div class="text-right mr-4 hidden md:block">
                <div class="text-xs text-gray-400 uppercase tracking-widest">Match Control</div>
                <div class="text-sm font-bold text-cyan-400">YOU ARE HOST</div>
            </div>

            <button
                onclick={startGame}
                class="px-12 py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-black text-xl tracking-widest text-white shadow-lg shadow-pink-500/20 hover:scale-105 hover:shadow-pink-500/40 transition active:scale-95"
            >
                START MATCH
            </button>
        {:else}
            <div class="flex items-center gap-3 px-8 py-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div class="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="font-bold text-gray-300 tracking-wide text-sm">WAITING FOR HOST TO START</span>
            </div>
        {/if}
    </div>
</div>