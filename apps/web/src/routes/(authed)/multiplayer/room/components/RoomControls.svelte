<script lang="ts">
    interface Props {
        handleLeaveRoom: () => void;
        isLeaving: boolean;
        isHost: boolean;
        isReady: boolean;
        toggleReady: () => void;
        startGame: () => void;
    }

    let { handleLeaveRoom, isLeaving, isHost, isReady, toggleReady, startGame }: Props = $props();
</script>

<div class="absolute bottom-0 w-full h-24 bg-linear-to-t zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz z-20 flex items-center justify-between px-12 pb-6">

    <button
        onclick={handleLeaveRoom}
        disabled={isLeaving}
        class="px-8 py-3 rounded-lg font-bold tracking-widest text-red-500 border border-red-900/50 hover:bg-red-950/50 hover:border-red-500 hover:text-red-400 transition-all uppercase text-sm"
    >
        {isLeaving ? 'LEAVING...' : 'LEAVE ROOM'}
    </button>

    <div class="flex gap-4">
        {#if isHost}
            <button
                onclick={startGame}
                class="px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black italic tracking-widest text-xl rounded-xl shadow-[0_0_30px_rgba(8,145,178,0.4)] hover:shadow-[0_0_50px_rgba(8,145,178,0.6)] hover:-translate-y-1 transition-all uppercase transform skew-x-[-10deg]"
            >
                START MATCH
            </button>
        {:else}
            <button
                onclick={toggleReady}
                class="px-12 py-4 font-black italic tracking-widest text-xl rounded-xl border-2 transition-all uppercase transform skew-x-[-10deg] {isReady ? 'bg-green-600 border-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'}"
            >
                {isReady ? 'READY!' : 'CLICK TO READY'}
            </button>
        {/if}
    </div>
</div>