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
			difficulty?: string | null;
		} | null;
		owner?: { id: string; name?: string | null; avatarUrl?: string | null };
		isPasswordProtected?: boolean;
	};

	const { room }: { room: RoomListItem } = $props();

	const isPasswordProtected = $derived(room.isPasswordProtected);
	const coverUrl = $derived(room.currentChart?.coverUrl ?? null);
	const beatmapName = $derived(room.currentChart?.name ?? 'No beatmap selected');
	const beatmapArtist = $derived(room.currentChart?.artist ?? '');
	const difficultyName = $derived(
		room.currentChart?.difficultyName ?? room.currentChart?.difficulty ?? ''
	);
	const ownerName = $derived(room.hostName ?? room.owner?.name ?? 'Unknown Host');
	const ownerAvatar = $derived(room.owner?.avatarUrl ?? null);

	const status = $derived(room.status ?? 'idle');
</script>

<div
	class="relative w-full h-24 bg-gray-800/40 hover:bg-gray-800/60 border border-white/5 hover:border-purple-500/50 rounded-xl overflow-hidden transition-all duration-200 group flex items-center shadow-lg backdrop-blur-sm"
>
	<!-- Left: Song Art -->
	<div class="relative w-40 h-full overflow-hidden shrink-0">
		{#if coverUrl}
			<div
				class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
				style:background-image="url({coverUrl})"
			></div>
		{:else}
			<div
				class="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center"
			>
				<span class="text-3xl opacity-20">🎵</span>
			</div>
		{/if}
		<div class="absolute inset-0 bg-gradient-to-r from-transparent to-gray-800/20"></div>
	</div>

	<!-- Center: Room & Map Info -->
	<div class="flex-1 px-6 flex flex-col justify-center min-w-0">
		<div class="flex items-center gap-3 mb-1">
			<h3
				class="text-xl font-black italic tracking-tighter text-white truncate group-hover:text-purple-400 transition-colors"
				title={room.name}
			>
				{room.name.toUpperCase()}
			</h3>
			{#if isPasswordProtected}
				<span
					class="text-yellow-500 text-xs bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 font-bold uppercase tracking-widest"
					>PRIVATE</span
				>
			{/if}
		</div>

		<div class="flex items-center gap-2 text-sm">
			<span class="text-gray-400 font-medium truncate">{beatmapName}</span>
			{#if beatmapArtist}
				<span class="text-gray-600">•</span>
				<span class="text-gray-500 truncate">{beatmapArtist}</span>
			{/if}
		</div>
	</div>

	<!-- Right: Stats & Status -->
	<div class="px-8 flex items-center gap-8 shrink-0">
		<!-- Difficulty Badge -->
		{#if difficultyName}
			<div class="hidden md:flex flex-col items-end">
				<span class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-0.5"
					>Difficulty</span
				>
				<span class="text-sm font-black text-purple-400 italic">{difficultyName.toUpperCase()}</span
				>
			</div>
		{/if}

		<!-- Player Count -->
		<div class="flex flex-col items-end min-w-[80px]">
			<span class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-0.5"
				>Players</span
			>
			<div class="flex items-baseline gap-1">
				<span class="text-xl font-black text-white">{room.playerCount ?? 0}</span>
				<span class="text-xs text-gray-600 font-bold">/ 16</span>
			</div>
		</div>

		<!-- Status Indicator -->
		<div class="flex flex-col items-end min-w-[100px]">
			<span class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-0.5"
				>Status</span
			>
			<div class="flex items-center gap-2">
				<div
					class="w-2 h-2 rounded-full {status === 'playing'
						? 'bg-red-500 animate-pulse'
						: 'bg-green-500'}"
				></div>
				<span
					class="text-xs font-bold uppercase tracking-widest {status === 'playing'
						? 'text-red-400'
						: 'text-green-400'}"
				>
					{status === 'playing' ? 'Playing' : 'In Lobby'}
				</span>
			</div>
		</div>
	</div>

	<!-- Host Overlay (Small) -->
	<div
		class="absolute bottom-2 left-44 flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity"
	>
		{#if ownerAvatar}
			<img src={ownerAvatar} alt="" class="w-4 h-4 rounded-full border border-white/20" />
		{/if}
		<span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest"
			>Host: {ownerName}</span
		>
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
