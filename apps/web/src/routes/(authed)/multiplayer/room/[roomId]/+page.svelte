<script lang="ts">
import { onMount } from "svelte";
import { page } from "$app/state";
import { goto } from "$app/navigation";
import {
	gameSocket,
	currentRoomState,
	socketStatus,
} from "$lib/network/socket";
import { fade } from "svelte/transition";
import PlayerList from "../components/PlayerList.svelte";
import SongSelector from "../components/SongSelector.svelte";
import RoomInfo from "../components/RoomInfo.svelte";
import RoomControls from "../components/RoomControls.svelte";
import SongSelectOverlay from "$lib/components/SongSelectOverlay.svelte";
import { orpcClient } from "$lib/rpc/client";

const { data } = $props();

// State
let roomId = $state<string | null>(null);
let roomDetails = $state<any | null>(null);
let isLoading = $state(true);
let error = $state<string | null>(null);
let isLeaving = $state(false);
let connectionStatus = $state<"disconnected" | "connecting" | "connected">(
	"disconnected",
);

// Countdown and time sync state
let countdownValue = $state<number | null>(null);
let timeOffset = $state<number>(0); // Offset between client and server time

// Derived State
let isHost = $derived(roomDetails?.hostId === data.session?.user?.id);

let showCountdownOverlay = $derived(roomDetails?.status === "starting");
// Song selection overlay state
let isSongSelectOpen = $state(false);
let availableSongs = $state<any[]>([]);

// Time synchronization
function syncTimeWithServer() {
	const t1 = Date.now();
	// Send ping with our timestamp
	gameSocket.send("ping", { t1 });
}

function handlePong(data: any) {
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
	gameSocket.send("join_room", { roomId: id });
	gameSocket.send("get_room_state", { roomId: id });
}

async function handleLeaveRoom() {
	if (!roomId) return;
	isLeaving = true;
	try {
		gameSocket.send("leave_room", { roomId });
		await goto("/multiplayer");
	} catch (e) {
		console.error(e);
	}
	isLeaving = false;
}

function startGame() {
	if (!isHost || !roomId) return;

	// Validation: Make sure a song is actually selected before starting!
	if (!roomDetails?.currentChart) {
		alert("Please select a song first!");
		return;
	}

	console.log("Host requesting start match...");

	// Send the command to the server
	gameSocket.send("start_match", { roomId });
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
		// Send the selected song data to the server to update room state
		gameSocket.send("update_room", {
			roomId,
			currentChart: {
				coverUrl: song.imageUrl,
				name: song.title,
				artist: song.artist,
				difficulty: song.difficulties?.[0] || "Unknown", // Default to first difficulty
				songId: song.id, // Include song ID for future chart resolution
				difficulties: song.difficulties, // Include all difficulties for future use
			},
		});

		console.log("Sent update_room message for song:", song.title);
	} catch (error) {
		console.error("Error selecting song:", error);
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
			availableSongs = result.items || [];
		})
		.catch((error) => {
			console.error("Failed to fetch songs:", error);
			// Fall back to empty array, overlay will use mock data
		});

	// Set up time sync pong handler
	gameSocket.setPongCallback(handlePong);

	// Sync time with server on connection
	const unsubStatus = socketStatus.subscribe((status) => {
		connectionStatus = status;
		if (status === "connected") {
			syncTimeWithServer();
		}
	});

	const unsubRoom = currentRoomState.subscribe((state) => {
		if (state && state.id === roomId) {
			roomDetails = { ...state, players: state.players ?? [] };

			// Handle countdown logic
			if (state.status === "starting" && state.startTime) {
				// Start countdown timer
				const updateCountdown = () => {
					const secondsLeft = Math.ceil(
						(state.startTime! - getServerTime()) / 1000,
					);
					countdownValue = Math.max(0, secondsLeft);

					if (countdownValue > 0) {
						requestAnimationFrame(updateCountdown);
					} else {
						countdownValue = null;
					}
				};
				updateCountdown();
			}

			// Handle game start
			if (state.status === "playing") {
				goto(`/game/${roomId}`);
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

<div class="flex-1 w-full bg-gray-900 text-white overflow-hidden flex flex-col items-center justify-center font-sans">

    <SongSelectOverlay
        isOpen={isSongSelectOpen}
        onClose={() => isSongSelectOpen = false}
        onSelect={handleSongSelection}
        songs={availableSongs}
    />

    {#if showCountdownOverlay}
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div class="text-center">
                <div class="text-8xl font-black text-white mb-4 animate-pulse">
                    {countdownValue ?? 3}
                </div>
                <div class="text-xl text-cyan-400 font-bold tracking-widest">
                    GET READY!
                </div>
            </div>
        </div>
    {/if}

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
            startGame={startGame}
        />
    {/if}
</div>