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
	showMultiplayerLeaderboard={false}
	callbacks={{
		onScoreUpdate: (score, combo, maxCombo) => {
			// Solo mode: Could save intermediate progress here if needed
			console.log('[Solo] Score update:', score, 'combo:', combo);
		},
		onMatchFinished: (finalScore, maxCombo) => {
			// Solo mode: Save score to local DB
			console.log('[Solo] Match finished with score:', finalScore, 'maxCombo:', maxCombo);
			// TODO: Implement score saving via orpcClient
		},
		onRetry: () => {
			console.log('[Solo] Retrying song');
		},
		onExit: () => {
			goto('/solo');
		},
	}}
/>
