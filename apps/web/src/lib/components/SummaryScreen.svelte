<script lang="ts">
import { fade, fly, scale } from "svelte/transition";
import { backOut, cubicOut } from "svelte/easing";
import { matchState } from "$lib/network/socket";
import type { MouseEventHandler } from "svelte/elements";

interface Props {
	score: number;
	maxCombo: number;
	songTitle?: string;
	artist?: string;
	difficultyName?: string;
	onRetry?: MouseEventHandler<HTMLButtonElement>;
	onExit: MouseEventHandler<HTMLButtonElement>;
	isMultiplayer?: boolean;
}

const {
	score,
	maxCombo,
	songTitle = "",
	artist = "",
	difficultyName = "",
	onRetry,
	onExit,
	isMultiplayer = false,
}: Props = $props();

const formattedScore = $derived(score.toLocaleString().padStart(7, '0'));

// Sort peers by score descending for the ranking table
const leaderboard = $derived(
	Object.values($matchState).sort((a, b) => b.score - a.score)
);

const allFinished = $derived(
	!isMultiplayer || (leaderboard.length > 0 && leaderboard.every(p => p.finished))
);
</script>

<div 
	class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
	in:fade={{ duration: 400 }}
>
	<div 
		class="w-full max-w-2xl bg-black/40 backdrop-blur-xl border border-white/5 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
		in:fly={{ y: 40, duration: 600, easing: backOut }}
	>
		<!-- Header Section -->
		<div class="p-10 pb-6 text-center space-y-2">
			<span class="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-400">
				{allFinished ? 'SESSION COMPLETE' : 'WAITING FOR OTHERS...'}
			</span>
			<h1 class="text-6xl font-black italic tracking-tighter text-white drop-shadow-2xl">
				RESULTS<span class="text-purple-500">.</span>
			</h1>
		</div>

		<!-- Song Info Bar -->
		<div class="px-10 py-4 bg-white/5 border-y border-white/5 flex justify-between items-center">
			<div class="flex flex-col text-left">
				<span class="text-xl font-black italic text-white leading-tight">{songTitle}</span>
				<span class="text-xs font-bold text-gray-500 italic uppercase tracking-wider">{artist}</span>
			</div>
			<div class="px-3 py-1 rounded bg-purple-500/20 border border-purple-500/40">
				<span class="text-[10px] font-black uppercase tracking-widest text-purple-300">
					{difficultyName}
				</span>
			</div>
		</div>

		<!-- Stats Grid -->
		<div class="px-10 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
			<!-- Score -->
			<div class="space-y-1">
				<span class="text-[10px] font-black uppercase tracking-widest text-gray-500">YOUR TOTAL SCORE</span>
				<div class="text-5xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
					{formattedScore}
				</div>
			</div>

			<!-- Max Combo -->
			<div class="space-y-1">
				<span class="text-[10px] font-black uppercase tracking-widest text-gray-500">YOUR MAX COMBO</span>
				<div class="text-5xl font-black italic tracking-tighter text-pink-500 tabular-nums drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">
					{maxCombo}<span class="text-xl ml-1 not-italic opacity-50 font-black text-white">x</span>
				</div>
			</div>
		</div>

		<!-- Multiplayer Ranking Table -->
		{#if isMultiplayer && leaderboard.length > 0}
			<div class="px-10 pb-10 flex flex-col gap-2">
				<span class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">FINAL RANKING</span>
				<div class="flex flex-col gap-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
					{#each leaderboard as peer, i (peer.userId)}
						<div 
							class="flex items-center justify-between p-3 rounded-xl border transition-all {peer.finished ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/5 bg-white/5 opacity-50'}"
						>
							<div class="flex items-center gap-4">
								<span class="text-xs font-black italic text-gray-500 tabular-nums w-4">#{i + 1}</span>
								<div class="flex flex-col">
									<span class="text-sm font-black italic text-white leading-none">{peer.username}</span>
									{#if !peer.finished}
										<span class="text-[8px] font-bold text-cyan-400 uppercase tracking-widest mt-1 animate-pulse">PLAYING...</span>
									{/if}
								</div>
							</div>
							<div class="text-right">
								<div class="text-lg font-black italic text-gray-200 leading-none tabular-nums">
									{peer.score.toLocaleString()}
								</div>
								<div class="text-[10px] font-bold text-gray-500 uppercase tabular-nums">
									{peer.combo}x
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Action Footer -->
		<div class="p-10 pt-0 flex flex-col sm:flex-row gap-4">
			{#if !isMultiplayer}
				<button 
					onclick={onRetry} 
					class="flex-1 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-xl italic tracking-widest text-white transition-all active:scale-[0.98]"
				>
					RETRY
				</button>
			{/if}
			
			<button 
				onclick={onExit} 
				class="flex-[1.5] py-5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-black text-xl italic tracking-widest text-white shadow-lg shadow-pink-500/20 hover:scale-[1.02] hover:shadow-pink-500/40 transition-all active:scale-[0.98]"
			>
				{isMultiplayer ? 'RETURN TO LOBBY' : 'FINISH SESSION'}
			</button>
		</div>
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 10px;
	}
</style>