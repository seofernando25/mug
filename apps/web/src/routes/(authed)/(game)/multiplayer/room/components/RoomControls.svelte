<script lang="ts">
interface Props {
	handleLeaveRoom: () => void;
	isLeaving: boolean;
	isHost: boolean;
	startGame: () => void;
}

const { handleLeaveRoom, isLeaving, isHost, startGame }: Props = $props();
</script>

<div class="h-24 bg-gray-900/90 border-t border-white/10 backdrop-blur-md flex items-center justify-between px-6 z-30">
    <!-- Left: Back / Leave -->
    <button
        onclick={handleLeaveRoom}
        disabled={isLeaving}
        class="group flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
    >
        <div class="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
            <svg class="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
        </div>
        <div class="text-left">
            <div class="text-[10px] font-bold uppercase tracking-widest text-red-400 group-hover:text-red-300">Return to</div>
            <div class="text-sm">LOBBY</div>
        </div>
    </button>

    <!-- Right: Match Control -->
    <div class="flex items-center gap-6">
        {#if isHost}
            <button
                onclick={startGame}
                class="px-12 py-4 bg-linear-to-r from-green-500 to-emerald-600 rounded-xl font-black text-xl tracking-widest text-white shadow-lg shadow-green-900/20 hover:scale-105 hover:shadow-green-500/30 transition active:scale-95 skew-x-[-10deg]"
            >
                <span class="block skew-x-10">START MATCH</span>
            </button>
        {/if}
    </div>
</div>