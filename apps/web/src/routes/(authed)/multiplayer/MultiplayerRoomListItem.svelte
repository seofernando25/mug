<script lang="ts">
type RoomListItem = {
	id: string;
	name: string;
	playerCount?: number;
	status?: string;
	hostId?: string | null;
	hostName?: string | null;
	currentChart?: {
		coverUrl?: string | null;
		name?: string | null;
		artist?: string | null;
		difficultyName?: string | null;
	} | null;
	owner?: { id: string; name?: string | null; avatarUrl?: string | null };
	isPasswordProtected?: boolean;
};

const { room }: { room: RoomListItem } = $props();

// TODO: Later, more sophisticated status/game mode icons or colors
const getStatusColor = (status: string | undefined | null) => {
	if (status === "Playing") return "bg-red-500";
	if (status === "Freestyle") return "bg-blue-500";
	return "bg-green-500"; // Open
};

const isPasswordProtected = $derived(room.isPasswordProtected);
const coverUrl = $derived(room.currentChart?.coverUrl ?? null);
const beatmapName = $derived(room.currentChart?.name ?? "No beatmap selected");
const beatmapArtist = $derived(room.currentChart?.artist ?? "");
const difficultyName = $derived(room.currentChart?.difficultyName ?? "");
const ownerName = $derived(room.hostName ?? room.owner?.name ?? "Unknown Host");
const ownerAvatar = $derived(room.owner?.avatarUrl ?? null);
</script>

<div
	class="relative rounded-lg shadow-lg text-white overflow-hidden transition-all duration-200 ease-in-out hover:scale-[1.02] cursor-pointer group"
>
	<!-- Background Image with Gradient -->
	<div
		class="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-in-out group-hover:scale-110"
		style:background-image={coverUrl
			? `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.95) 100%), url(${coverUrl})`
			: 'linear-gradient(to bottom, rgba(55, 65, 81, 0.8) 0%, rgba(31, 41, 55, 0.95) 100%)'}
	></div>

	<!-- Content -->
	<div class="relative p-4 flex flex-col justify-between h-full min-h-[180px]">
		<div>
			<div class="flex justify-between items-start mb-2">
				<span
					class="px-2 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider shadow"
					class:bg-green-500={!room.currentChart}
					class:text-green-900={!room.currentChart}
					class:bg-purple-500={!!room.currentChart}
					class:text-purple-100={!!room.currentChart}
				>
					{room.currentChart ? 'Playing' : 'Open'}
				</span>
				{#if isPasswordProtected}
					<div class="p-1.5 bg-black/30 rounded-full">
						<!-- <LockClosedSolid class="h-4 w-4 text-gray-300" /> -->
						<span class="text-xs text-gray-300 px-1">[Lock]</span>
					</div>
				{/if}
			</div>

			<h3 class="text-xl font-bold truncate" title={room.name}>{room.name}</h3>

			{#if room.currentChart}
				<div class="text-sm text-gray-300 mt-1">
					<p class="truncate" title={beatmapName}>{beatmapName}</p>
					<p class="text-xs text-gray-400 truncate" title={beatmapArtist}>{beatmapArtist}</p>
					{#if difficultyName}
						<p class="text-xs text-gray-400 mt-0.5">Difficulty: {difficultyName}</p>
					{/if}
				</div>
			{:else}
				<div class="text-sm text-gray-400 mt-1 italic">No beatmap selected</div>
			{/if}
		</div>

		<div class="mt-auto pt-3">
			<div class="flex items-center justify-between text-xs text-gray-400">
				<div class="flex items-center">
					{#if ownerAvatar}
						<img
							src={ownerAvatar}
							alt="{ownerName}'s avatar"
							class="h-5 w-5 rounded-full mr-1.5 border border-gray-600"
						/>
					{/if}
					<span class="truncate">Hosted by {ownerName}</span>
				</div>
				<div class="flex items-center">
					<!-- <UserGroupSolid class="h-4 w-4 mr-1 text-gray-500" /> -->
					<span class="mr-1">Players:</span>
					<span>{room.playerCount ?? 0}</span>
					<!-- Max players can be added if needed -->
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.bg-cover {
		background-size: cover;
	}
	.bg-center {
		background-position: center;
	}
</style>
