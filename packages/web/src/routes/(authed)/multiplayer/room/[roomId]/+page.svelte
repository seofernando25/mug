<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { orpcClient } from '$lib/rpc-client';
	import { onMount } from 'svelte';

	let roomId = $state<number | null>(null);
	let roomDetails = $state<any | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let leaveError = $state<string | null>(null);
	let isLeaving = $state(false);
	let wantsToStopSubscription = $state(false);

	// ORPC Event Iterator related state
	let eventIterator: Awaited<
		ReturnType<typeof orpcClient.multiplayer.room.subscribeToRoomEvents>
	> | null = null;
	let sseStatus = $state('Disconnected');
	let isSubscribed = $state(false);

	function initializeRoom(id: number) {
		roomId = id;
		loadRoomDetails();
		startEventSubscription();
	}

	async function loadRoomDetails() {
		const currentRoomId = roomId;
		if (currentRoomId === null) return;
		isLoading = true;
		error = null;
		try {
			const result = await orpcClient.multiplayer.room.get({ roomId: currentRoomId });
			if (result.success) {
				roomDetails = result.room;
			} else {
				console.error('Failed to load room details:', result.error);
				error = result.error?.message ?? 'Unknown error loading room details.';
				if (result.error?.code === 'NOT_FOUND') {
					await goto('/multiplayer');
				}
			}
		} catch (e: any) {
			console.error('Exception loading room details:', e);
			error = e.message ?? 'An exception occurred.';
		}
		isLoading = false;
	}

	async function handleLeaveRoom() {
		const currentRoomId = roomId;
		if (currentRoomId === null) return;

		// Stop the event subscription first
		wantsToStopSubscription = true;
		if (eventIterator) {
			try {
				await eventIterator.return();
			} catch (e) {
				console.error('Error stopping event iterator:', e);
			}
		}

		isLeaving = true;
		leaveError = null;
		try {
			const result = await orpcClient.multiplayer.room.leave({ roomId: currentRoomId });
			if (result.success) {
				await goto('/multiplayer');
			} else {
				console.error('Failed to leave room:', result.error);
				leaveError = result.error?.message ?? 'Could not leave room.';
			}
		} catch (e: any) {
			console.error('Exception leaving room:', e);
			leaveError = e.message ?? 'An exception occurred while leaving.';
		}
		isLeaving = false;
	}

	async function startEventSubscription() {
		const currentRoomId = roomId;
		if (currentRoomId === null || isSubscribed) return;

		sseStatus = 'Connecting...';
		isSubscribed = true;

		try {
			eventIterator = await orpcClient.multiplayer.room.subscribeToRoomEvents({
				roomId: currentRoomId
			});

			if (!eventIterator) {
				sseStatus = 'Error: Failed to connect';
				isSubscribed = false;
				return;
			}

			for await (const event of eventIterator) {
				if (wantsToStopSubscription) {
					break;
				}

				if (event.success === true) {
					if (event.type === 'CONNECTION_ESTABLISHED') {
						sseStatus = 'Connected';
					}
				} else if (event.success === false) {
					sseStatus = `Error: ${event.message}`;
					break;
				}
			}

			if (isSubscribed) sseStatus = 'Disconnected';
		} catch (err: any) {
			console.error('Event stream error:', err);
			sseStatus = 'Disconnected';
		} finally {
			if (isSubscribed) {
				isSubscribed = false;
				if (!sseStatus.startsWith('Error')) {
					sseStatus = 'Disconnected';
				}
			}
		}
	}

	onMount(() => {
		const idStr = page.params.roomId;
		const id = parseInt(idStr, 10);
		if (!isNaN(id)) {
			initializeRoom(id);
		} else {
			error = 'Invalid Room ID in URL.';
			isLoading = false;
		}

		// Handle browser/tab closing
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			wantsToStopSubscription = true;
			if (eventIterator) {
				// Try to gracefully close the connection
				eventIterator.return?.();
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			wantsToStopSubscription = true;
			if (eventIterator) {
				eventIterator.return?.();
			}
			window.removeEventListener('beforeunload', handleBeforeUnload);
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

				<!-- Right Column: Game Area / Chat (Placeholder) -->
				<div class="md:col-span-2 p-4 bg-gray-800 rounded-lg shadow min-h-[300px] flex flex-col">
					<h2 class="text-xl font-semibold mb-2 border-b border-gray-700 pb-2">Game Area</h2>
					<div class="flex-grow flex items-center justify-center">
						<p class="text-gray-500 italic">Gameplay will appear here.</p>
					</div>
					<div class="mt-auto">
						<h3 class="text-lg font-semibold mb-1">
							Connection Status: <span
								class="font-normal text-sm {sseStatus === 'Connected'
									? 'text-green-400'
									: sseStatus.startsWith('Error')
										? 'text-red-400'
										: 'text-yellow-400'}">{sseStatus}</span
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
