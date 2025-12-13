<script lang="ts">
import { fly } from "svelte/transition";

interface Player {
	userId: string;
	username?: string | null;
	avatarUrl?: string | null;
}

interface Props {
	players: Player[];
	hostId?: string | null;
}

let { players, hostId }: Props = $props();
</script>

<div class="w-1/4 h-full flex flex-col justify-center gap-4 pl-8" in:fly={{ x: -50, duration: 500 }}>
    <h3 class="text-gray-500 text-sm font-bold tracking-widest uppercase mb-2">Players ({players.length}/8)</h3>

    {#each players as player (player.userId)}
        <div class="group relative bg-gray-800/60 border-l-4 border-gray-600 p-3 rounded-r-lg flex items-center gap-3 backdrop-blur-sm transition-all duration-300 hover:bg-gray-700/80 hover:pl-5 hover:border-cyan-400">
            {#if player.avatarUrl}
                <img src={player.avatarUrl} alt={player.username} class="w-10 h-10 rounded-full border border-gray-500" />
            {:else}
                <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">?</div>
            {/if}

            <div class="flex flex-col">
                <span class="font-bold text-sm tracking-wide group-hover:text-cyan-300 transition-colors">
                    {player.username || 'Anonymous'}
                </span>
                <span class="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    {#if hostId === player.userId}
                        <span class="text-yellow-500">👑 Host</span>
                    {:else}
                        <span class="text-gray-500">Guest</span>
                    {/if}
                </span>
            </div>

            <div class="ml-auto pr-2">
                 <div class="w-3 h-3 rounded-full bg-gray-600 shadow-[0_0_5px_rgba(0,0,0,0.5)]"></div>
            </div>
        </div>
    {/each}

    {#each Array(Math.max(0, 4 - players.length)) as _}
         <div class="bg-gray-900/30 border-l-4 border-transparent p-3 rounded-r-lg flex items-center gap-3 opacity-50 border-dashed border-gray-700">
            <div class="w-10 h-10 rounded-full bg-gray-800/50"></div>
            <span class="text-gray-600 text-sm italic">Empty Slot</span>
         </div>
    {/each}
</div>