<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { SongListItem } from './types';

	const {
		song
	}: {
		song: SongListItem;
	} = $props();

	// Dummy leaderboard data - replace with actual data fetching
	// The structure should now align with LeaderboardEntry from $lib/types
	let leaderboard = [
		{
			rank: 1,
			user: {
				id: '1',
				username: 'Mikayla',
				displayUsername: 'Mikayla',
				image: 'https://placekitten.com/32/32?image=1'
			},
			score: 1293803,
			accuracy: 99.1,
			maxCombo: 668, // Example value
			playDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000) // Approx 2 years ago
		},
		{
			rank: 2,
			user: {
				id: '2',
				username: 'Haxwell',
				displayUsername: 'Haxwell',
				image: 'https://placekitten.com/32/32?image=2'
			},
			score: 1270072,
			accuracy: 98.52,
			maxCombo: 667,
			playDate: new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000)
		}
		// ... Add more entries matching LeaderboardEntry structure
	];

	let personalBest = {
		rank: 130000,
		user: {
			id: 'currentUser',
			username: 'SeoFernando',
			displayUsername: 'SeoFernando',
			image: 'https://placekitten.com/32/32?image=6'
		},
		score: 726168,
		accuracy: 96.38,
		maxCombo: 342,
		playDate: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
	};
</script>

{#if song}
	<div class="p-6 bg-gray-850 text-white h-full flex flex-col" transition:fade={{ duration: 300 }}>
		<!-- Top section with song details -->

		<div
			class="relative p-6 rounded-lg mb-6 shadow-xl bg-gray-800"
			style:background-image={song.imageUrl
				? `linear-gradient(rgba(30, 41, 51, 0.85), rgba(30, 41, 51, 0.95)), url(${song.imageUrl})`
				: ''}
			style:background-size="cover"
			style:background-position="center"
		>
			<div class="relative z-10">
				<h2 class="text-4xl font-bold mb-1 text-purple-300">{song.title}</h2>
				<p class="text-xl text-gray-300 mb-4">{song.artist}</p>

				<div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
					<p><span class="font-semibold text-gray-400">BPM:</span> {song.bpm}</p>
					<p><span class="font-semibold text-gray-400">Preview:</span> {song.previewStartTime}ms</p>
					<p>
						<span class="font-semibold text-gray-400">Uploaded:</span>
						{new Date(song.uploadDate).toLocaleDateString()}
					</p>
				</div>

				<!-- Placeholder for Circle Size, Accuracy, HP Drain, Approach Rate -->
				<div class="space-y-1 text-sm mb-4">
					<div class="flex justify-between">
						<span class="text-gray-400">Circle Size</span><span>4</span>
					</div>
					<div class="w-full bg-gray-700 rounded-full h-1.5">
						<div class="bg-purple-500 h-1.5 rounded-full" style="width: 40%"></div>
					</div>

					<div class="flex justify-between">
						<span class="text-gray-400">Accuracy</span><span>6</span>
					</div>
					<div class="w-full bg-gray-700 rounded-full h-1.5">
						<div class="bg-purple-500 h-1.5 rounded-full" style="width: 60%"></div>
					</div>

					<div class="flex justify-between">
						<span class="text-gray-400">HP Drain</span><span>5</span>
					</div>
					<div class="w-full bg-gray-700 rounded-full h-1.5">
						<div class="bg-purple-500 h-1.5 rounded-full" style="width: 50%"></div>
					</div>

					<div class="flex justify-between">
						<span class="text-gray-400">Approach Rate</span><span>8</span>
					</div>
					<div class="w-full bg-gray-700 rounded-full h-1.5">
						<div class="bg-purple-500 h-1.5 rounded-full" style="width: 80%"></div>
					</div>
				</div>

				<div class="flex space-x-2 text-gray-300 text-xs">
					<span>Details</span>
					<span class="text-white font-semibold border-b-2 border-purple-400 pb-px">Local</span>
					<span>Global</span>
					<span>Country</span>
					<span>Friend</span>
					<span>Team</span>
				</div>
			</div>
		</div>

		<!-- Leaderboard Section -->
		<div class="flex-grow overflow-y-auto bg-gray-800 p-4 rounded-lg shadow-inner">
			<h3 class="text-xl font-semibold mb-3 text-purple-400">Leaderboard (Placeholder)</h3>
			<ul class="space-y-2">
				{#each leaderboard as entry (entry.rank)}
					<li class="flex items-center p-2 bg-gray-750 rounded hover:bg-gray-700 transition-colors">
						<span class="w-8 text-sm text-gray-400">{entry.rank}</span>
						<!-- <img
							src={entry.user.image || 'https://placekitten.com/32/32'}
							alt="{entry.user.displayUsername || entry.user.username}'s avatar"
							class="w-8 h-8 rounded-full mr-3"
						/> -->
						<div class="flex-grow">
							<span class="text-white">{entry.user.displayUsername || entry.user.username}</span>
							<p class="text-xs text-gray-400">{new Date(entry.playDate).toLocaleDateString()}</p>
						</div>
						<div class="text-right">
							<span class="text-lg font-semibold text-purple-300"
								>{entry.score.toLocaleString()}</span
							>
							<p class="text-xs text-green-400">{entry.accuracy.toFixed(2)}%</p>
						</div>
					</li>
				{/each}
			</ul>

			{#if personalBest}
				<div class="mt-6 pt-4 border-t border-gray-700">
					<h4 class="text-lg font-semibold mb-2 text-purple-400">Your Personal Best</h4>
					<li class="flex items-center p-2 bg-gray-750 rounded">
						<span class="w-8 text-sm text-gray-400">{personalBest.rank.toLocaleString()}</span>
						<!-- <img
							src={personalBest.user.image || 'https://placekitten.com/32/32'}
							alt="{personalBest.user.displayUsername || personalBest.user.username}'s avatar"
							class="w-8 h-8 rounded-full mr-3"
						/> -->
						<div class="flex-grow">
							<span class="text-white"
								>{personalBest.user.displayUsername || personalBest.user.username}</span
							>
							<p class="text-xs text-gray-400">
								{new Date(personalBest.playDate).toLocaleDateString()}
							</p>
						</div>
						<div class="text-right">
							<span class="text-lg font-semibold text-purple-300"
								>{personalBest.score.toLocaleString()}</span
							>
							<p class="text-xs text-green-400">{personalBest.accuracy.toFixed(2)}%</p>
						</div>
					</li>
				</div>
			{/if}
		</div>
		<!-- Bottom Buttons -->
		<div class="mt-6 flex space-x-2">
			<button
				class="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded text-white font-semibold transition-colors"
				>Back</button
			>
			<button
				class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-semibold transition-colors"
				>Mods</button
			>
			<button
				class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-semibold transition-colors"
				>Rewind</button
			>
			<button
				class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-semibold transition-colors"
				>Options</button
			>
		</div>
	</div>
{:else}
	<div class="p-6 bg-gray-850 text-white h-full flex flex-col items-center justify-center">
		<p class="text-xl text-gray-500">Select a song to see details.</p>
	</div>
{/if}

<style>
	.bg-gray-850 {
		background-color: #1f2937; /* Slightly darker than gray-800 for the main panel bg */
	}
	.bg-gray-750 {
		background-color: #374151; /* A color between gray-700 and gray-800 for list items */
	}
</style>
