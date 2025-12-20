<script lang="ts">
	import AppShell from '$lib/components/AppShell.svelte';
	const { children } = $props();
</script>

<AppShell>
	{@render children()}
</AppShell>
