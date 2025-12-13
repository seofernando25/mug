<script lang="ts">
import { goto } from "$app/navigation";
import GameSession from "$lib/components/game/GameSession.svelte";

const { data } = $props();

function handleMatchFinished(finalScore: number, maxCombo: number) {
	// Navigate to results page with the game results
	goto('/solo/results', {
		state: {
			score: finalScore,
			maxCombo: maxCombo,
			songData: data.songData,
			chartData: data.chartData
		}
	});
}
</script>

<svelte:head>
	<title>Playing: {data.songData.title}</title>
</svelte:head>

<GameSession
	songData={data.songData}
	chartData={data.chartData}
	suppressSummaryScreen={true}
	callbacks={{
		onScoreUpdate: (score, combo, maxCombo) => {},
		onMatchFinished: handleMatchFinished,
		onRetry: () => {},
		onExit: () => {
			goto('/solo');
		},
	}}
/>