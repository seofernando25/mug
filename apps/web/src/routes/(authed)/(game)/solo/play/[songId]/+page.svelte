<script lang="ts">
import { goto } from "$app/navigation";
import GameSession from "$lib/components/game/GameSession.svelte";

const { data } = $props();
</script>

<svelte:head>
	<title>Playing: {data.songData.title}</title>
</svelte:head>

<GameSession
	songData={data.songData}
	chartData={data.chartData}
	callbacks={{
		onScoreUpdate: (score: number, combo: number, maxCombo: number) => {},
		onMatchFinished: (finalScore: number, maxCombo: number) => {},
		onRetry: () => {},
		onExit: () => {
			goto('/solo');
		},
	}}
/>