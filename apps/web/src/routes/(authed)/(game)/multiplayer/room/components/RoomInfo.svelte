<script lang="ts">
	import { fly } from 'svelte/transition';

	interface Props {
		roomId: string | null;
		connectionStatus: string;
	}

	const { roomId, connectionStatus }: Props = $props();
</script>

<div
	class="w-1/4 h-full flex flex-col justify-center pr-8 items-end gap-4 opacity-50 pointer-events-none"
	in:fly={{ x: 50, duration: 500 }}
>
	<div class="text-right">
		<h4 class="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Room ID</h4>
		<p class="font-mono text-cyan-600 bg-cyan-950/30 px-2 py-1 rounded">{roomId}</p>
	</div>

	<div class="text-right">
		<h4 class="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Status</h4>
		<p class="text-gray-300">{connectionStatus}</p>
	</div>
</div>
