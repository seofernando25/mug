<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { gameSocket, currentRoomState, socketStatus } from '$lib/network/socket';

	let roomId = $state<string | null>(null);
	let roomDetails = $state<any | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let leaveError = $state<string | null>(null);
	let isLeaving = $state(false);
	let connectionStatus = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');

	function initializeRoom(id: string) {
		roomId = id;
		roomDetails = null;
		isLoading = true;
		error = null;
		// Request room state over WS and join the room
		gameSocket.connect();
		gameSocket.send({ op: 'join_room', data: { roomId: id } } as any);
		gameSocket.send({ op: 'get_room_state', data: { roomId: id } } as any);
	}

	async function handleLeaveRoom() {
		const currentRoomId = roomId;
		console.log('handleLeaveRoom', currentRoomId);
		if (currentRoomId === null) return;

		isLeaving = true;
		leaveError = null;
		try {
			gameSocket.send({ op: 'leave_room', data: { roomId: currentRoomId } } as any);
			await goto('/multiplayer');
		} catch (e: any) {
			console.error('Exception leaving room:', e);
			leaveError = e.message ?? 'An exception occurred while leaving.';
		}
		isLeaving = false;
	}

	onMount(() => {
		const idStr = page.params.roomId;
		initializeRoom(idStr);
		const unsubRoom = currentRoomState.subscribe((state) => {
			if (state && state.id === roomId) {
				roomDetails = {
					...state,
					players: state.players ?? []
				};
				isLoading = false;
			}
		});
		const unsubStatus = socketStatus.subscribe((v) => (connectionStatus = v));

		return () => {
			unsubRoom();
			unsubStatus();
		};
	});
</script>

<div class="container mx-auto p-4 md:p-8 text-white min-h-screen bg-gray-900">
	{#if isLoading}
		<p class="text-center text-gray-400 text-lg py-10">Loading room details...</p>
	{:else if error}
		<div class="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-md my-4">
			<p class="font-semibold">Error:</p>
			<p>{error}</p>
			<button
				onclick={() => goto('/multiplayer')}
				class="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
			>
				Back to Lounge
			</button>
		</div>
	{:else if roomDetails}
		<div class="space-y-6">
			<header class="flex justify-between items-center">
				<h1 class="text-3xl font-bold">{roomDetails.name}</h1>
				<button
					onclick={handleLeaveRoom}
					disabled={isLeaving}
					class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50"
				>
					{isLeaving ? 'Leaving...' : 'Leave Room'}
				</button>
			</header>
			{#if leaveError}
				<p class="text-red-400 bg-red-900 p-2 rounded">Error leaving room: {leaveError}</p>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<!-- Left Column: Chart Info & Players -->
				<div class="md:col-span-1 space-y-4 p-4 bg-gray-800 rounded-lg shadow">
					<div>
						<h2 class="text-xl font-semibold mb-2 border-b border-gray-700 pb-2">
							Current Beatmap
						</h2>
						{#if roomDetails.currentChart}
							<div class="space-y-1">
								{#if roomDetails.currentChart.coverUrl}
									<img
										src={roomDetails.currentChart.coverUrl}
										alt={roomDetails.currentChart.name ?? 'Beatmap cover'}
										class="w-full h-auto object-cover rounded-md mb-2 max-h-60"
									/>
								{/if}
								<p class="text-lg font-medium">{roomDetails.currentChart.name ?? 'N/A'}</p>
								<p class="text-sm text-gray-400">
									Artist: {roomDetails.currentChart.artist ?? 'N/A'}
								</p>
								<p class="text-sm text-gray-400">
									Difficulty: {roomDetails.currentChart.difficultyName ?? 'N/A'}
								</p>
							</div>
						{:else}
							<p class="text-gray-400 italic">No beatmap selected.</p>
						{/if}
					</div>

					<div>
						<h2 class="text-xl font-semibold mb-2 border-b border-gray-700 pb-2">
							Players ({roomDetails.players.length})
						</h2>
						<ul class="space-y-2">
							{#each roomDetails.players as player (player.userId)}
								<li class="flex items-center p-2 bg-gray-700 rounded-md">
									{#if player.avatarUrl}
										<img
											src={player.avatarUrl}
											alt="{player.username}'s avatar"
											class="h-8 w-8 rounded-full mr-3"
										/>
									{:else}
										<div
											class="h-8 w-8 rounded-full bg-gray-600 mr-3 flex items-center justify-center text-sm"
										>
											?
										</div>
									{/if}
									<span>{player.username}</span>
									{#if roomDetails.owner && player.userId === roomDetails.owner.id}
										<span class="ml-2 text-xs px-1.5 py-0.5 bg-purple-600 rounded-full">Host</span>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				</div>

				<!-- Right Column: Placeholder for song selection (empty block) + status -->
				<div class="md:col-span-2 p-4 bg-gray-800 rounded-lg shadow min-h-[300px] flex flex-col">
					<h2 class="text-xl font-semibold mb-2 border-b border-gray-700 pb-2">
						Song Selection (coming soon)
					</h2>
					<div class="flex-grow flex items-center justify-center">
						<p class="text-gray-500 italic">This area is intentionally empty for now.</p>
					</div>
					<div class="mt-auto">
						<h3 class="text-lg font-semibold mb-1">
							Connection Status:
							<span
								class="font-normal text-sm {connectionStatus === 'connected'
									? 'text-green-400'
									: connectionStatus === 'disconnected'
										? 'text-red-400'
										: 'text-yellow-400'}">{connectionStatus}</span
							>
						</h3>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<p class="text-center text-gray-500 text-lg py-10">Room not found or could not be loaded.</p>
	{/if}
</div>

<style lang="postcss">
	.container {
		max-width: 1400px;
	}
</style>
