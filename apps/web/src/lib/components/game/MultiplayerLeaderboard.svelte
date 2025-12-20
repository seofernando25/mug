<script lang="ts">
import { matchState } from "$lib/network/socket";
import { fly } from "svelte/transition";

// Sort peers by score descending
$: leaderboard = Object.values($matchState).sort((a, b) => b.score - a.score);
</script>

<div class="absolute top-1/2 -translate-y-1/2 left-4 w-64 flex flex-col gap-1 pointer-events-none">
	{#each leaderboard as peer, i (peer.userId)}
		<div
			transition:fly={{ x: -20, duration: 300 }}
			class="bg-black/60 text-white p-2 rounded flex justify-between items-center text-sm border-l-4"
			class:border-green-500={peer.finished}
			class:border-transparent={!peer.finished}
		>
			<div class="flex gap-2">
				<span class="font-bold text-gray-400">#{i + 1}</span>
				<span class="font-medium truncate max-w-[100px]">{peer.username || 'Unknown'}</span>
			</div>
			<div class="flex flex-col items-end leading-none">
				<span class="font-mono font-bold">{peer.score.toLocaleString()}</span>
				<span class="text-xs text-gray-400">{peer.combo}x</span>
			</div>
		</div>
	{/each}
</div>

