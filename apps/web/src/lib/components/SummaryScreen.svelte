<script lang="ts">
import { fade, fly, scale } from "svelte/transition";
import { backOut, cubicOut } from "svelte/easing";

const {
	score,
	maxCombo,
	songTitle = "",
	artist = "",
	difficultyName = "",
	onRetry = () => {},
	onExit = () => {},
	isMultiplayer = false,
} = $props();

const formattedScore = $derived(score.toLocaleString().padStart(7, '0'));
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
			<span class="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-400">SESSION COMPLETE</span>
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
		<div class="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
			<!-- Score -->
			<div class="space-y-1">
				<span class="text-[10px] font-black uppercase tracking-widest text-gray-500">TOTAL SCORE</span>
				<div class="text-5xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
					{formattedScore}
				</div>
			</div>

			<!-- Max Combo -->
			<div class="space-y-1">
				<span class="text-[10px] font-black uppercase tracking-widest text-gray-500">MAX COMBO</span>
				<div class="text-5xl font-black italic tracking-tighter text-pink-500 tabular-nums drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">
					{maxCombo}<span class="text-xl ml-1 not-italic opacity-50 font-black text-white">x</span>
				</div>
			</div>
		</div>

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
				FINISH SESSION
			</button>
		</div>
	</div>
</div>

<style>
	/* Custom styles if needed, but Tailwind handles most of it */
</style>