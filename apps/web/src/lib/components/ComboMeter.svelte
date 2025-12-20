<script lang="ts">
	const { combo = 0 } = $props();
</script>

{#if combo > 0}
	<div class="fixed top-[20%] left-1/2 -translate-x-1/2 pointer-events-none z-50 select-none">
		{#key combo}
			<div class="flex flex-col items-center animate-pop">
				<span
					class="text-[10px] font-black uppercase tracking-[0.5em] text-pink-500 leading-none mb-1 ml-[0.5em]"
					>COMBO</span
				>
				<span
					class="text-8xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(236,72,153,0.6)]"
				>
					{combo}
				</span>
			</div>
		{/key}
	</div>
{/if}

<style>
	@keyframes pop {
		0% {
			transform: scale(0.9);
			opacity: 0.8;
		}
		50% {
			transform: scale(1.05);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
	.animate-pop {
		animation: pop 0.1s cubic-bezier(0, 0, 0.2, 1) forwards;
	}
</style>
