<script lang="ts">
interface Player {
	userId: string;
	username?: string | null;
	avatarUrl?: string | null;
}

interface Props {
	players: Player[];
	hostId?: string | null;
}

const { players, hostId }: Props = $props();
</script>

<div class="h-full flex flex-col gap-2 p-4 overflow-y-auto">
    <div class="flex items-center justify-between mb-2">
        <h3 class="text-gray-500 text-xs font-bold tracking-widest uppercase">Participants</h3>
        <span class="text-xs text-gray-600 font-bold">{players.length} / 16</span>
    </div>

    <!-- Active Players -->
    {#each players as player (player.userId)}
        <div class="group relative bg-gray-800 border-l-4 border-transparent p-2 rounded flex items-center gap-3 transition-colors hover:bg-gray-750
            {hostId === player.userId ? 'border-yellow-500 bg-yellow-500/5' : 'border-green-500'}">
            
            <div class="relative">
                {#if player.avatarUrl}
                    <img src={player.avatarUrl} alt={player.username} class="w-8 h-8 rounded border border-white/10" />
                {:else}
                    <div class="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400">?</div>
                {/if}
                
                {#if hostId === player.userId}
                    <div class="absolute -top-2 -right-2 text-[10px]" title="Host">👑</div>
                {/if}
            </div>

            <div class="flex flex-col min-w-0">
                <span class="font-bold text-xs text-white truncate group-hover:text-purple-300 transition-colors">
                    {player.username || 'Anonymous'}
                </span>
                <span class="text-[10px] text-gray-500 font-mono">#{player.userId.slice(0, 4)}</span>
            </div>

            <div class="ml-auto">
                 <!-- Ready Status Indicator (Mock) -->
                 <div class="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold border border-green-500/30 uppercase">
                    Ready
                 </div>
            </div>
        </div>
    {/each}

    <!-- Empty Slots -->
    {#each Array(Math.max(0, 8 - players.length)) as _, i}
         <div class="bg-black/20 border border-white/5 p-2 rounded flex items-center gap-3 opacity-60">
            <div class="w-8 h-8 rounded bg-white/5"></div>
            <span class="text-gray-600 text-xs italic">Empty</span>
         </div>
    {/each}
</div>