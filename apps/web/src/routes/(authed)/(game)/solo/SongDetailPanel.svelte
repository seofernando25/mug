<script lang="ts">
import { fade, fly } from "svelte/transition";
import { goto } from "$app/navigation";
import type { SongListItem } from "./types";

const {
	song,
	selectedDifficulty = "",
	onDifficultySelect = () => {},
}: {
	song: SongListItem;
	selectedDifficulty?: string;
	onDifficultySelect?: (diff: string) => void;
} = $props();

// Dummy leaderboard data
const leaderboard = [
	{
		rank: 1,
		user: { id: "1", username: "Mikayla", displayUsername: "Mikayla", image: "" },
		score: 1293803,
		accuracy: 99.1,
		maxCombo: 668,
		playDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
	},
	{
		rank: 2,
		user: { id: "2", username: "Haxwell", displayUsername: "Haxwell", image: "" },
		score: 1270072,
		accuracy: 98.52,
		maxCombo: 667,
		playDate: new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000),
	},
];
</script>

{#if song}
	<div class="h-full flex flex-col p-8 pt-12 space-y-6" in:fly={{ x: -50, duration: 400 }}>
		<!-- Header -->
		<div>
			<h1 class="text-5xl font-black tracking-tight italic text-white drop-shadow-lg leading-tight">
				{song.title}
			</h1>
			<p class="text-2xl text-cyan-300 font-light mt-1">{song.artist}</p>

			<div class="flex items-center gap-4 mt-4 text-sm font-bold text-gray-400">
				{#if song.difficulties && song.difficulties.length > 0}
					<span class="bg-gray-800/80 px-3 py-1 rounded border border-gray-600">
						{song.difficulties.length} Difficulties
					</span>
				{/if}
				<span>BPM: {song.bpm}</span>
			</div>
		</div>

		<!-- Info Panel -->
		<div class="flex-1 bg-black/40 rounded-xl border border-white/10 overflow-hidden flex flex-col backdrop-blur-md">
			<div class="bg-black/50 p-4 border-b border-white/10 flex justify-between items-center">
				<span class="font-bold text-lg tracking-widest text-gray-200">CHART INFO</span>
				<span class="text-xs text-gray-500">DETAILS</span>
			</div>

			<div class="overflow-y-auto p-4 space-y-6 custom-scrollbar">
				<!-- Difficulties -->
				{#if song.difficulties && song.difficulties.length > 0}
					<div>
						<h4 class="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Select Difficulty</h4>
						<div class="space-y-1">
							{#each song.difficulties as difficulty}
								<button
									class="w-full text-left px-3 py-2 rounded text-sm transition-colors flex justify-between items-center
									{selectedDifficulty === difficulty
										? 'bg-purple-600 text-white font-bold shadow-md'
										: 'bg-gray-800/50 text-gray-200 hover:bg-gray-700'}"
									onclick={() => onDifficultySelect(difficulty)}
								>
									<span>{difficulty}</span>
									{#if selectedDifficulty === difficulty}
										<span class="text-xs bg-white/20 px-2 py-0.5 rounded text-white">SELECTED</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Leaderboard -->
				<div>
					<h4 class="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Leaderboard</h4>
					<div class="space-y-1">
						{#each leaderboard as entry}
							<div class="flex items-center p-2 bg-gray-800/30 rounded border border-white/5">
								<span class="w-6 text-sm text-gray-400 font-bold">#{entry.rank}</span>
								<div class="flex-grow">
									<span class="text-sm text-gray-200">{entry.user.displayUsername}</span>
								</div>
								<div class="text-right">
									<span class="text-sm font-bold text-purple-300">{entry.score.toLocaleString()}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="h-full flex items-center justify-center text-gray-500">
		<p class="text-xl">Select a song to see details.</p>
	</div>
{/if}

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.1);
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}
</style>
