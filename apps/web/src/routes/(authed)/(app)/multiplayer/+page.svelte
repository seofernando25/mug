<script lang="ts">
import { onMount, tick } from "svelte";
import MultiplayerRoomListItem from "./MultiplayerRoomListItem.svelte";
import { goto } from "$app/navigation";
import { gameSocket, lobbyRooms, socketStatus } from "$lib/network/socket";
import { orpcClient } from "$lib/rpc/client";
import type { SongWheelItem } from "$lib/components/song-select/SongWheel.svelte";
import SongSelectOverlay from "$lib/components/SongSelectOverlay.svelte";
import { scale, slide } from "svelte/transition";

// --- Types ---
type RoomFilterType = 'all' | 'public' | 'private';

// --- State ---
let isLoading = $state(true);
let rooms = $state<any[]>([]);
const error = $state<string | null>(null);
let status = $state<"disconnected" | "connecting" | "connected">("disconnected");

// Filters & Search
let searchTerm = $state("");
let filterType = $state<RoomFilterType>('all');
let showInProgress = $state(true);
let showFilterDropdown = $state(false);

// Song Selection & Room Creation
let allSongs = $state<SongWheelItem[]>([]);
let isLoadingSongs = $state(false);
let isSelectingSong = $state(false); // If true, show SongWheel overlay
let selectedSong = $state<SongWheelItem | null>(null);
let selectedDifficulty = $state<string>("Normal");
let showCreateRoomPanel = $state(false); // Toggle for the creation panel

// Form State
let newRoomName = $state("");
let newRoomPassword = $state("");
let isCreatingRoom = $state(false);
let createRoomError = $state<string | null>(null);

// --- Lifecycle ---
onMount(async () => {
	const unsubLobby = lobbyRooms.subscribe((v) => {
		rooms = v ?? [];
		isLoading = false;
	});
	const unsubStatus = socketStatus.subscribe((v) => {
		status = v;
	});
	gameSocket.connect();
	
	// Pre-fetch songs for the creator
	isLoadingSongs = true;
	try {
		const res = await orpcClient.song.list({});
		allSongs = res.items.map(s => ({
			id: s.id,
			title: s.title,
			artist: s.artist,
			imageUrl: s.imageUrl,
			difficulties: s.difficulties,
			audioUrl: s.audioUrl,
			previewStartTime: s.previewStartTime
		}));
	} catch (e) {
		console.error("Failed to load songs", e);
	} finally {
		isLoadingSongs = false;
	}

	return () => {
		unsubLobby();
		unsubStatus();
	};
});

// --- Derived ---
const filteredRooms = $derived(
	rooms.filter((room) => {
		// 1. Search
		if (searchTerm.trim()) {
			const lower = searchTerm.toLowerCase();
			const matchName = room.name.toLowerCase().includes(lower);
			const matchHost = (room.hostName ?? "").toLowerCase().includes(lower);
			const matchSong = (room.currentChart?.name ?? "").toLowerCase().includes(lower);
			if (!matchName && !matchHost && !matchSong) return false;
		}

		// 2. Filter Type
		if (filterType === 'public' && room.isPasswordProtected) return false;
		if (filterType === 'private' && !room.isPasswordProtected) return false;

		// 3. In Progress
		if (!showInProgress && room.status !== 'idle') return false;

		return true;
	})
);

// --- Actions ---

function toggleCreateRoomPanel() {
	showCreateRoomPanel = !showCreateRoomPanel;
	if (showCreateRoomPanel) {
		// Reset form when opening
		createRoomError = null;
		// Keep previous inputs/song if user just closed and re-opened
	}
}

function openSongSelector() {
	isSelectingSong = true;
}

function handleOverlaySelect(data: { song: SongWheelItem; difficulty: string }) {
	selectedSong = data.song;
	selectedDifficulty = data.difficulty;
	isSelectingSong = false;
	
	// Auto-fill name if empty and not already typed
	if (!newRoomName && selectedSong) {
		newRoomName = `${selectedSong.title} Room`;
	}
}

async function handleCreateRoomSubmit() {
	if (!newRoomName.trim()) {
		createRoomError = "Room name is required.";
		return;
	}
	if (!selectedSong) {
		createRoomError = "Please select a beatmap.";
		return;
	}

	isCreatingRoom = true;
	createRoomError = null;

	try {
		// 1. Create Room
		gameSocket.send("create_room", { name: newRoomName.trim() });

		await gameSocket.waitForPacket((pkt) => 
			(pkt?.op === "ack" && pkt.data?.message === "room_created") || null
		);

		const roomState = await gameSocket.waitForPacket((pkt) => 
			pkt?.op === "room_state" && pkt.data?.name === newRoomName.trim()
				? pkt.data
				: null
		, 3000);

		if (!roomState?.id) throw new Error("Failed to get room ID.");

		// 2. Update with Song
		// We need to construct the ChartInfo object
		const chartInfo = {
			songId: selectedSong.id,
			name: selectedSong.title,
			artist: selectedSong.artist,
			coverUrl: selectedSong.imageUrl,
			difficulty: selectedDifficulty || selectedSong.difficulties?.[0] || "Normal",
			difficulties: selectedSong.difficulties
		};

		gameSocket.send("update_room", {
			roomId: roomState.id,
			currentChart: chartInfo
		});

		// 3. Join
		showCreateRoomPanel = false;
		await goto(`/multiplayer/room/${roomState.id}`);

	} catch (e: any) {
		console.error("Exception creating room:", e);
		createRoomError = e?.message ?? "An exception occurred while creating the room.";
	}
	isCreatingRoom = false;
}

function handleRoomClick(roomId: string) {
	goto(`/multiplayer/room/${roomId}`);
}

// --- Click Outside for Dropdown ---
function handleDocumentClick(e: MouseEvent) {
	const target = e.target as HTMLElement;
	if (!target.closest('#filter-dropdown') && !target.closest('#filter-btn')) {
		showFilterDropdown = false;
	}
	// Note: We intentionally don't auto-close the create room panel on outside click 
	// because it contains a form and complex interactions. User should click "Cancel" or toggle button.
}
</script>

<svelte:window onclick={handleDocumentClick} />

<div class="flex flex-col">
	<!-- HEADER -->
	<header class="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-40">
		<!-- Left: Create Panel Container -->
		<div class="flex flex-col relative">
			<h1 class="text-4xl font-black italic tracking-tighter text-white drop-shadow-md mb-2">
				MULTIPLAYER <span class="text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-cyan-400">LOUNGE</span>
			</h1>
			
			<button
				onclick={toggleCreateRoomPanel}
				class="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/40 transform hover:scale-105 transition-all duration-200 flex items-center justify-between gap-3"
			>
				<span>{showCreateRoomPanel ? '− CANCEL' : '+ CREATE ROOM'}</span>
			</button>

			<!-- Create Room Dropdown Panel -->
			{#if showCreateRoomPanel}
				<div 
					transition:slide={{ axis: 'y', duration: 300 }}
					class="absolute top-full left-0 mt-4 w-96 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 z-50 overflow-hidden"
				>
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleCreateRoomSubmit();
						}}
						class="space-y-4"
					>
						<div>
							<label for="roomName" class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1"
								>Room Name</label
							>
							<input
								type="text"
								id="roomName"
								bind:value={newRoomName}
								class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none placeholder-gray-600 transition-all text-sm"
								placeholder="e.g. Chill Lobby"
							/>
						</div>
						
						<div>
							<label for="roomPassword" class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1"
								>Password <span class="text-gray-600 normal-case font-normal">(Optional)</span></label
							>
							<input
								type="password"
								id="roomPassword"
								bind:value={newRoomPassword}
								class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none placeholder-gray-600 transition-all text-sm"
								placeholder="Leave empty for public"
							/>
						</div>

						<!-- Beatmap Selector Button -->
						<div>
							<span class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Beatmap</span>
							<button
								type="button"
								onclick={openSongSelector}
								class="w-full group relative h-16 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors bg-gray-900 flex items-center justify-center"
							>
								{#if selectedSong}
									<!-- Selected State -->
									<div class="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-40 transition-opacity" style:background-image="url({selectedSong.imageUrl})"></div>
									<div class="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-transparent"></div>
									<div class="relative z-10 w-full px-4 text-left">
										<p class="font-bold text-white truncate text-sm">{selectedSong.title}</p>
										<p class="text-xs text-gray-400 truncate">{selectedSong.artist}</p>
									</div>
									<div class="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-xs bg-gray-800/80 px-2 py-1 rounded text-gray-300 border border-gray-600">
										CHANGE
									</div>
								{:else}
									<!-- Empty State -->
									<span class="text-sm font-bold text-gray-500 group-hover:text-purple-400 transition-colors">Select a Beatmap</span>
								{/if}
							</button>
						</div>

						{#if createRoomError}
							<div class="p-2 rounded bg-red-900/30 border border-red-500/30 text-red-300 text-xs font-medium">
								{createRoomError}
							</div>
						{/if}

						<button
							type="submit"
							disabled={isCreatingRoom}
							class="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2"
						>
							{isCreatingRoom ? 'CREATING...' : 'CREATE ROOM'}
						</button>
					</form>
				</div>
			{/if}
		</div>

		<!-- Right: Search & Filters -->
		<div class="flex flex-col items-end gap-2 w-full md:w-auto relative">
			<div class="flex gap-2 w-full md:w-auto">
				<!-- Search Bar -->
				<div class="relative w-full md:w-64">
					<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
					<input
						type="text"
						bind:value={searchTerm}
						placeholder="Search rooms..."
						class="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
					/>
				</div>

				<!-- Filter Toggle Button -->
				<button
					id="filter-btn"
					onclick={() => showFilterDropdown = !showFilterDropdown}
					class="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition flex items-center gap-2"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
					Filters
				</button>
			</div>

			<!-- Dropdown Menu -->
			{#if showFilterDropdown}
				<div
					id="filter-dropdown"
					transition:scale={{ start: 0.95, duration: 150 }}
					class="absolute top-full right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 p-4"
				>
					<div class="space-y-4">
						<!-- Show In Progress -->
						<div class="flex items-center justify-between">
							<span class="text-sm font-bold text-gray-400 uppercase tracking-wider">In Progress</span>
							<label class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" bind:checked={showInProgress} class="sr-only peer">
								<div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
							</label>
						</div>

						<hr class="border-gray-700" />

						<!-- Room Type -->
						<div>
							<span class="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Room Type</span>
							<div class="flex flex-col gap-2">
								<label class="flex items-center gap-2 cursor-pointer hover:bg-gray-700/50 p-1 rounded">
									<input type="radio" bind:group={filterType} value="all" class="text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600" />
									<span class="text-sm text-gray-200">All Rooms</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer hover:bg-gray-700/50 p-1 rounded">
									<input type="radio" bind:group={filterType} value="public" class="text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600" />
									<span class="text-sm text-gray-200">Public Only</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer hover:bg-gray-700/50 p-1 rounded">
									<input type="radio" bind:group={filterType} value="private" class="text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600" />
									<span class="text-sm text-gray-200">Password Protected</span>
								</label>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</header>

	<!-- ROOM LIST -->
	{#if status === 'connecting' || isLoading}
		<div class="flex-1 flex items-center justify-center">
			<div class="animate-pulse flex flex-col items-center">
				<div class="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
				<p class="text-gray-400 text-lg tracking-widest">CONNECTING TO LOBBY...</p>
			</div>
		</div>
	{:else if error}
		<div class="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-xl my-4 text-center backdrop-blur-sm">
			<p class="font-bold text-xl mb-2">Connection Error</p>
			<p>{error}</p>
		</div>
	{:else if filteredRooms.length > 0}
		<div class="flex flex-col gap-3">
			{#each filteredRooms as room (room.id)}
				<button
					type="button"
					onclick={() => handleRoomClick(room.id)}
					class="text-left w-full block outline-none transform transition-all active:scale-[0.99]"
				>
					<MultiplayerRoomListItem {room} />
				</button>
			{/each}
		</div>
	{:else}
		<div class="flex-1 flex flex-col items-center justify-center text-center py-12 opacity-50">
			<div class="text-6xl mb-4 grayscale">🎵</div>
			<h2 class="text-2xl font-bold text-gray-300">No Rooms Found</h2>
			<p class="text-gray-500 mt-2">Adjust your filters or create a new room!</p>
		</div>
	{/if}
</div>

<SongSelectOverlay
	isOpen={isSelectingSong}
	onClose={() => isSelectingSong = false}
	onSelect={handleOverlaySelect}
	songs={allSongs}
/>

<style>
	/* No custom styles needed for dialog anymore */
</style>