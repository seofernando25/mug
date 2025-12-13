<script lang="ts">
const { children } = $props();
</script>

<div class="flex flex-col grow h-full">
	{@render children()}
</div>
