<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { gameSocket, currentRoomState, socketStatus, type RoomState } from '$lib/network/socket';
	import { fade } from 'svelte/transition';
	import PlayerList from '../components/PlayerList.svelte';
	import BeatmapCard from '../components/SongSelector.svelte';
	import RoomHeader from '../components/RoomHeader.svelte';
	import RoomControls from '../components/RoomControls.svelte';
	import ChatPanel from '../components/ChatPanel.svelte';
	import SongSelectOverlay from '$lib/components/SongSelectOverlay.svelte';
	import type { SongWheelItem } from '$lib/components/song-select/SongWheel.svelte';
	import { orpcClient } from '$lib/rpc/client';

	const { data } = $props();

	// State
	let roomId = $state<string | null>(null);
	let roomDetails = $state<RoomState | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isLeaving = $state(false);
	let connectionStatus = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');

	// Countdown and time sync state
	let countdownValue = $state<number | null>(null);
	let timeOffset = $state<number>(0); // Offset between client and server time

	// Derived State
	const isHost = $derived(roomDetails?.hostId === data.session?.user?.id);

	const showCountdownOverlay = $derived(roomDetails?.status === 'starting');
	// Song selection overlay state
	let isSongSelectOpen = $state(false);
	let availableSongs = $state<SongWheelItem[]>([]);

	// Time synchronization
	function syncTimeWithServer() {
		const t1 = Date.now();
		// Send ping with our timestamp
		gameSocket.send('ping', { t1 });
	}

	function handlePong(data: { message?: string; serverTime?: number; t1?: number }) {
		if (data.t1 && data.serverTime) {
			const t2 = Date.now();
			const latency = (t2 - data.t1) / 2;
			timeOffset = data.serverTime - (data.t1 + latency);
			console.log(`[Time Sync] Offset: ${timeOffset}ms, Latency: ${latency}ms`);
		}
	}

	function getServerTime(): number {
		return Date.now() + timeOffset;
	}

	function initializeRoom(id: string) {
		roomId = id;
		roomDetails = null;
		isLoading = true;
		error = null;
		gameSocket.connect();
		gameSocket.send('join_room', { roomId: id });
		gameSocket.send('get_room_state', { roomId: id });
	}

	async function handleLeaveRoom() {
		if (!roomId) return;
		isLeaving = true;
		try {
			gameSocket.send('leave_room', { roomId });
			await goto('/multiplayer');
		} catch (e) {
			console.error(e);
		}
		isLeaving = false;
	}

	function startGame() {
		if (!isHost || !roomId) return;

		// Validation: Make sure a song is actually selected before starting!
		if (!roomDetails?.currentChart) {
			alert('Please select a song first!');
			return;
		}

		console.log('Host requesting start match...');

		// Send the command to the server
		gameSocket.send('start_match', { roomId });
	}

	function openSongSelect() {
		if (!isHost) return;
		isSongSelectOpen = true;
	}

	async function handleUpdateRoom(name: string, password?: string) {
		if (!roomId || !isHost) return;

		try {
			gameSocket.send('update_room', {
				roomId,
				name,
				password
			});
			console.log('Sent room update:', name);
		} catch (error) {
			console.error('Error updating room:', error);
		}
	}

	async function handleSongSelection(data: { song: SongWheelItem; difficulty: string }) {
		const { song, difficulty } = data;
		console.log('Selected:', song.title, 'with difficulty:', difficulty);

		if (!roomId || !roomDetails?.name) {
			console.error('No room information available');
			return;
		}

		try {
			// Send the selected song data to the server to update room state
			gameSocket.send('update_room', {
				roomId,
				currentChart: {
					coverUrl: song.imageUrl || '',
					name: song.title,
					artist: song.artist,
					difficulty: difficulty, // Use selected difficulty
					songId: song.id, // Include song ID for future chart resolution
					difficulties: song.difficulties // Include all difficulties for future use
				}
			});

			console.log('Sent update_room message for song:', song.title);
		} catch (error) {
			console.error('Error selecting song:', error);
		}

		isSongSelectOpen = false;
	}

	onMount(() => {
		const idStr = page.params.roomId;
		if (idStr) initializeRoom(idStr);

		// Fetch available songs for the song selector (async, no await)
		orpcClient.song
			.list({})
			.then((result) => {
				availableSongs = (result.items || []).map((s) => ({
					id: s.id,
					title: s.title,
					artist: s.artist,
					imageUrl: s.imageUrl,
					difficulties: s.difficulties,
					audioUrl: s.audioUrl,
					previewStartTime: s.previewStartTime
				}));
			})
			.catch((error) => {
				console.error('Failed to fetch songs:', error);
				// Fall back to empty array, overlay will use mock data
			});

		// Set up time sync pong handler
		gameSocket.setPongCallback(handlePong);

		// Sync time with server on connection
		const unsubStatus = socketStatus.subscribe((status) => {
			connectionStatus = status;
			if (status === 'connected') {
				syncTimeWithServer();
			}
		});

		const unsubRoom = currentRoomState.subscribe((state) => {
			if (state && state.id === roomId) {
				const oldStatus = roomDetails?.status;
				roomDetails = { ...state, players: state.players ?? [] };

				// Handle countdown logic
				if (state.status === 'starting' && state.startTime) {
					// Start countdown timer
					const updateCountdown = () => {
						const secondsLeft = Math.ceil((state.startTime! - getServerTime()) / 1000);
						countdownValue = Math.max(0, secondsLeft);

						if (countdownValue > 0) {
							requestAnimationFrame(updateCountdown);
						} else {
							countdownValue = null;
						}
					};
					updateCountdown();
				}

				// If we just finished a match and returned to lobby, resync time
				if (state.status === 'idle' && oldStatus !== 'idle' && oldStatus !== undefined) {
					syncTimeWithServer();
				}

				// Handle game start - ONLY navigate when the loading phase begins
				// This prevents players who forfeit or join late from being stuck in a redirect loop
				if (state.status === 'loading') {
					goto(`/multiplayer/game/${roomId}`);
				}

				isLoading = false;
			}
		});
		return () => {
			unsubRoom();
			unsubStatus();
		};
	});
</script>

<div class="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white font-sans overflow-hidden">
	<!-- Dynamic Background (Blurred) -->
	{#if roomDetails?.currentChart?.coverUrl}
		<div class="absolute inset-0 z-0">
			<div
				class="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110"
				style:background-image="url({roomDetails.currentChart.coverUrl})"
			></div>
			<div class="absolute inset-0 bg-gray-950/80"></div>
		</div>
	{/if}

	<!-- Content Wrapper -->
	<div class="relative z-10 flex flex-col h-full">
		{#if isLoading}
			<div class="flex-1 flex items-center justify-center">
				<div class="animate-pulse text-2xl font-light tracking-widest text-cyan-400">
					CONNECTING...
				</div>
			</div>
		{:else if error}
			<div class="flex-1 flex items-center justify-center">
				<div
					class="bg-red-900/80 border border-red-500 p-6 rounded-xl text-center backdrop-blur-sm"
				>
					<h2 class="text-xl font-bold mb-2">Connection Error</h2>
					<p>{error}</p>
					<button
						onclick={() => goto('/multiplayer')}
						class="mt-4 px-6 py-2 bg-white text-red-900 font-bold rounded hover:bg-gray-200"
					>
						RETURN TO LOBBY
					</button>
				</div>
			</div>
		{:else if roomDetails}
			<!-- 1. Header -->
			<RoomHeader
				roomName={roomDetails.name ?? 'Untitled Room'}
				roomId={roomId || '???'}
				{isHost}
				onUpdateRoom={handleUpdateRoom}
			/>

			<!-- 2. Main Dashboard (3 Columns) -->
			<div class="flex-1 grid grid-cols-[300px_1fr_350px] min-h-0">
				<!-- Left: Participants -->
				<div class="border-r border-white/5 bg-black/20 backdrop-blur-sm">
					<PlayerList players={roomDetails.players} hostId={roomDetails.hostId} />
				</div>

				<!-- Center: Dashboard / Mods / Beatmap -->
				<div class="p-8 flex flex-col gap-6 overflow-y-auto">
					<!-- Beatmap Card -->
					<BeatmapCard currentChart={roomDetails.currentChart} {isHost} {openSongSelect} />
				</div>

				<!-- Right: Chat -->
				<div class="border-l border-white/5 bg-black/20 backdrop-blur-sm">
					<ChatPanel />
				</div>
			</div>

			<!-- 3. Footer / Controls -->
			<RoomControls {handleLeaveRoom} {isLeaving} {isHost} {startGame} />
		{/if}
	</div>

	<!-- Overlays -->
	<SongSelectOverlay
		isOpen={isSongSelectOpen}
		onClose={() => (isSongSelectOpen = false)}
		onSelect={handleSongSelection}
		songs={availableSongs}
	/>

	{#if showCountdownOverlay}
		<div
			class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
		>
			<div class="text-center">
				<div class="text-9xl font-black text-white mb-4 animate-pulse tabular-nums">
					{countdownValue ?? 3}
				</div>
				<div class="text-2xl text-cyan-400 font-bold tracking-[1em] uppercase">GET READY</div>
			</div>
		</div>
	{/if}
</div>
