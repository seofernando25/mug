<script lang="ts">
	import { onMount } from 'svelte';
	import { orpcClient } from '$lib/rpc-client';
	import MultiplayerRoomListItem from './MultiplayerRoomListItem.svelte';
	import { goto } from '$app/navigation';

	let isLoading = $state(true);
	let rooms = $state<Awaited<ReturnType<typeof orpcClient.multiplayer.room.list>>['rooms']>([]);
	let error = $state<string | null>(null);

	// Modal state
	let newRoomName = $state('');
	let newRoomPassword = $state('');
	let newRoomChartId = $state(''); // Simple text input for now
	let isCreatingRoom = $state(false);
	let createRoomError = $state<string | null>(null);
	let createRoomDialog: HTMLDialogElement;

	async function loadRooms() {
		isLoading = true;
		error = null;
		rooms = [];
		try {
			const result = await orpcClient.multiplayer.room.list();
			if (result.success) {
				rooms = result.rooms ?? [];
			} else {
				console.error('Failed to load rooms:', result.error);
				error = result.error?.message ?? 'Unknown error loading rooms.';
			}
		} catch (e: any) {
			console.error('Exception loading rooms:', e);
			error = e.message ?? 'An exception occurred while loading rooms.';
		}
		isLoading = false;
	}

	onMount(() => {
		loadRooms();
	});

	function openCreateRoomModal() {
		newRoomName = '';
		newRoomPassword = '';
		newRoomChartId = '';
		createRoomError = null;
		createRoomDialog?.showModal();
	}

	function closeCreateRoomModal() {
		createRoomDialog?.close();
	}

	async function handleCreateRoomSubmit() {
		if (!newRoomName.trim()) {
			createRoomError = 'Room name is required.';
			return;
		}
		isCreatingRoom = true;
		createRoomError = null;

		try {
			const result = await orpcClient.multiplayer.room.create({
				roomName: newRoomName.trim(),
				...(newRoomPassword.trim() && { roomPassword: newRoomPassword.trim() }),
				...(newRoomChartId.trim() && { currentChartId: newRoomChartId.trim() })
			});

			if (result.success && result.room) {
				closeCreateRoomModal();
				await goto(`/multiplayer/room/${result.room.id}`);
			} else {
				console.error('Failed to create room:', result.error);
				createRoomError = result.error?.message ?? 'Could not create room.';
			}
		} catch (e: any) {
			console.error('Exception creating room:', e);
			createRoomError = e.message ?? 'An exception occurred while creating the room.';
		}
		isCreatingRoom = false;
	}

	function handleRoomClick(roomId: number) {
		goto(`/multiplayer/room/${roomId}`);
	}
</script>

<div class="container mx-auto p-4 md:p-8">
	<header class="mb-8 flex justify-between items-center">
		<h1 class="text-3xl font-bold text-white">Multiplayer Lounge</h1>
		<button
			onclick={openCreateRoomModal}
			class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
		>
			Create Room
		</button>
	</header>

	{#if isLoading}
		<p class="text-center text-gray-400 text-lg py-10">Loading rooms...</p>
	{:else if error}
		<div class="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-md my-4">
			<p class="font-semibold">Error loading rooms:</p>
			<p>{error}</p>
			<button
				onclick={loadRooms}
				class="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white">Try Again</button
			>
		</div>
	{:else if rooms && rooms.length > 0}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
			{#each rooms as room (room.id)}
				<button
					type="button"
					onclick={() => handleRoomClick(room.id)}
					class="focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg p-0 text-left w-full block"
				>
					<MultiplayerRoomListItem {room} />
				</button>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12">
			<p class="text-5xl mb-4">🎵</p>
			<!-- Simple emoji placeholder -->
			<h2 class="text-xl font-semibold text-gray-300">No Rooms Available</h2>
			<p class="text-gray-400 mt-2">Why not be the first to create one?</p>
		</div>
	{/if}
</div>

<!-- Create Room Modal -->
<dialog
	bind:this={createRoomDialog}
	class="bg-gray-800 p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md text-white"
	aria-labelledby="create-room-modal-title"
>
	<h2 id="create-room-modal-title" class="text-2xl font-bold mb-6">Create New Room</h2>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleCreateRoomSubmit();
		}}
		class="space-y-4"
	>
		<div>
			<label for="roomName" class="block text-sm font-medium text-gray-300 mb-1"
				>Room Name <span class="text-red-400">*</span></label
			>
			<input
				type="text"
				id="roomName"
				bind:value={newRoomName}
				required
				class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500"
				placeholder="My Awesome Room"
			/>
		</div>
		<div>
			<label for="roomPassword" class="block text-sm font-medium text-gray-300 mb-1"
				>Password (Optional)</label
			>
			<input
				type="password"
				id="roomPassword"
				bind:value={newRoomPassword}
				class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500"
				placeholder="Keep it secret, keep it safe"
			/>
		</div>
		<div>
			<label for="currentChartId" class="block text-sm font-medium text-gray-300 mb-1"
				>Chart ID (Optional UUID)</label
			>
			<input
				type="text"
				id="currentChartId"
				bind:value={newRoomChartId}
				pattern="^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
				title="Enter a valid UUID (e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
				class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500"
				placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
			/>
			<p class="text-xs text-gray-500 mt-1">
				If you have a specific Chart ID (UUID) to start with.
			</p>
		</div>

		{#if createRoomError}
			<p class="text-sm text-red-400 bg-red-900/30 p-2 rounded-md">{createRoomError}</p>
		{/if}

		<div class="flex justify-end items-center gap-4 pt-4">
			<button
				type="button"
				onclick={closeCreateRoomModal}
				class="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
			>
				Cancel
			</button>
			<button
				type="submit"
				disabled={isCreatingRoom}
				class="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm disabled:opacity-50 transition-colors"
			>
				{isCreatingRoom ? 'Creating...' : 'Create Room'}
			</button>
		</div>
	</form>
</dialog>

<style lang="postcss">
	.container {
		max-width: 1280px;
	}

	dialog {
		margin: auto;
		border: none;
	}

	dialog::backdrop {
		background-color: rgba(0, 0, 0, 0.7);
	}
</style>
