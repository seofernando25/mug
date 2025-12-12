<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { gameSocket, currentRoomState, socketStatus } from '$lib/network/socket';
    import { fade } from 'svelte/transition';
    import PlayerList from '../components/PlayerList.svelte';
    import SongSelector from '../components/SongSelector.svelte';
    import RoomInfo from '../components/RoomInfo.svelte';
    import RoomControls from '../components/RoomControls.svelte';
    import SongSelectOverlay from '$lib/components/SongSelectOverlay.svelte';
    import { orpcClient } from '$lib/rpc/client';

    // State
    let roomId = $state<string | null>(null);
    let roomDetails = $state<any | null>(null);
    let isLoading = $state(true);
    let error = $state<string | null>(null);
    let isLeaving = $state(false);
    let connectionStatus = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');

    // Derived State (Mocked until server support is ready)
    let isHost = $derived(
        roomDetails?.hostId === 'TODO_GET_CURRENT_USER_ID' || true
    ); // Placeholder true for demo logic
    let isReady = $state(false); // Local ready state

    // Song selection overlay state
    let isSongSelectOpen = $state(false);
    let availableSongs = $state<any[]>([]);

    function initializeRoom(id: string) {
        roomId = id;
        roomDetails = null;
        isLoading = true;
        error = null;
        gameSocket.connect();
        gameSocket.send({ op: 'join_room', data: { roomId: id } } as any);
        gameSocket.send({ op: 'get_room_state', data: { roomId: id } } as any);
    }

    async function handleLeaveRoom() {
        if (!roomId) return;
        isLeaving = true;
        try {
            gameSocket.send({ op: 'leave_room', data: { roomId } } as any);
            await goto('/multiplayer');
        } catch (e) {
            console.error(e);
        }
        isLeaving = false;
    }

    function toggleReady() {
        isReady = !isReady;
        // gameSocket.send({ op: 'toggle_ready' }); // Coming soon
    }

    function startGame() {
        if (!isHost) return;
        console.log('Starting match...');
        // gameSocket.send({ op: 'start_match' }); // Coming soon
    }

    function openSongSelect() {
        if (!isHost) return;
        isSongSelectOpen = true;
    }

    async function handleSongSelection(song: any) {
        console.log("Selected:", song.title, "with difficulties:", song.difficulties);

        if (!roomId || !roomDetails?.name) {
            console.error("No room information available");
            return;
        }

        try {
            // TODO: For now, we can't actually set a chart since we need chart IDs, not song IDs
            // This is a placeholder until we implement proper chart selection
            console.log("Chart selection not yet implemented - song selected:", song.title);

            // For demonstration, we'll just close the overlay
            // In the future, this should:
            // 1. Show difficulty selection for the chosen song
            // 2. Get the chart ID for the selected difficulty
            // 3. Call the update room RPC with the chart ID

        } catch (error) {
            console.error("Error selecting song:", error);
        }

        isSongSelectOpen = false;
    }

    onMount(() => {
        const idStr = page.params.roomId;
        if (idStr) initializeRoom(idStr);

        // Fetch available songs for the song selector (async, no await)
        orpcClient.song.list({}).then((result) => {
            availableSongs = result.items || [];
        }).catch((error) => {
            console.error('Failed to fetch songs:', error);
            // Fall back to empty array, overlay will use mock data
        });

        const unsubRoom = currentRoomState.subscribe((state) => {
            if (state && state.id === roomId) {
                roomDetails = { ...state, players: state.players ?? [] };
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

<div class="flex-1 w-full bg-gray-900 text-white overflow-hidden flex flex-col items-center justify-center font-sans">

    <SongSelectOverlay
        isOpen={isSongSelectOpen}
        onClose={() => isSongSelectOpen = false}
        onSelect={handleSongSelection}
        songs={availableSongs}
    />

    {#if isLoading}
        <div class="z-10 animate-pulse text-2xl font-light tracking-widest text-cyan-400">CONNECTING...</div>
    {:else if error}
        <div class="z-10 bg-red-900/80 border border-red-500 p-6 rounded-xl text-center backdrop-blur-sm">
            <h2 class="text-xl font-bold mb-2">Connection Error</h2>
            <p>{error}</p>
            <button onclick={() => goto('/multiplayer')} class="mt-4 px-6 py-2 bg-white text-red-900 font-bold rounded hover:bg-gray-200">
                RETURN TO LOBBY
            </button>
        </div>
    {:else if roomDetails}
        <div class="z-10 w-full max-w-7xl h-full flex relative p-6">

            <PlayerList players={roomDetails.players} hostId={roomDetails.hostId} />

            <SongSelector
                currentChart={roomDetails.currentChart}
                isHost={isHost}
                openSongSelect={openSongSelect}
            />

            <RoomInfo roomId={roomId} connectionStatus={connectionStatus} />
        </div>

        <RoomControls
            handleLeaveRoom={handleLeaveRoom}
            isLeaving={isLeaving}
            isHost={isHost}
            isReady={isReady}
            toggleReady={toggleReady}
            startGame={startGame}
        />
    {/if}
</div>