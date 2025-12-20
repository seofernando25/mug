<script lang="ts">
import { slide } from "svelte/transition";

interface Props {
	roomName: string;
	roomId: string;
	isHost: boolean;
	onUpdateRoom?: (name: string, password?: string) => void;
}

let { roomName, roomId, isHost, onUpdateRoom }: Props = $props();

let isSettingsOpen = $state(false);
let editPassword = $state("");

function toggleSettings() {
	if (!isSettingsOpen) {
		roomName = roomName;
		editPassword = "";
	}
	isSettingsOpen = !isSettingsOpen;
}

function handleSave() {
	if (onUpdateRoom) {
		onUpdateRoom(roomName, editPassword || undefined);
	}
	isSettingsOpen = false;
}

// Click outside to close
function handleDocumentClick(e: MouseEvent) {
	const target = e.target as HTMLElement;
	if (isSettingsOpen && !target.closest('#settings-panel') && !target.closest('#settings-btn')) {
		isSettingsOpen = false;
	}
}
</script>

<svelte:window onclick={handleDocumentClick} />

<div class="bg-gray-900/80 border-b border-white/10 backdrop-blur-md p-4 flex items-center justify-between shadow-lg z-20 relative">
	<!-- Left: Room Info -->
	<div class="flex items-center gap-4">
		<div class="flex flex-col">
			<div class="flex items-center gap-3">
				<h1 class="text-xl font-black italic text-white tracking-tight">{roomName || "Untitled Room"}</h1>
				<!-- Room Tags -->
				<div class="flex gap-1">
					<span class="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase tracking-wider">Versus</span>
				</div>
			</div>
			
			<div class="flex items-center gap-2 mt-1">
				<span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID:</span>
				<span class="font-mono text-xs text-gray-400 bg-black/30 px-1.5 py-0.5 rounded select-all">{roomId}</span>
			</div>
		</div>
	</div>

	<!-- Right: Settings -->
	<div class="relative">
		{#if isHost}
			<button 
				id="settings-btn"
				onclick={toggleSettings}
				class="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 rounded text-xs font-bold text-purple-300 uppercase tracking-wider transition-colors {isSettingsOpen ? 'bg-purple-600/40' : ''}"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
				Settings
			</button>

			{#if isSettingsOpen}
				<div 
					id="settings-panel"
					transition:slide={{ axis: 'y', duration: 200 }}
					class="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-white/10 rounded-xl shadow-2xl p-4 z-50 origin-top-right"
				>
					<h2 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Edit Room Details</h2>
					
					<div class="space-y-4">
						<div>
							<label for="roomName" class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Room Name</label>
							<input 
								type="text" 
								id="roomName"
								bind:value={roomName}
								class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
							/>
						</div>

						<div>
							<label for="roomPass" class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Password <span class="text-gray-600 font-normal normal-case">(Optional)</span></label>
							<input 
								type="password" 
								id="roomPass"
								bind:value={editPassword}
								placeholder="Leave blank to keep unchanged"
								class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
							/>
						</div>
					</div>

					<div class="flex items-center justify-end gap-2 mt-6">
						<button 
							onclick={() => isSettingsOpen = false}
							class="px-3 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
						>
							CANCEL
						</button>
						<button 
							onclick={handleSave}
							class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all"
						>
							SAVE
						</button>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>