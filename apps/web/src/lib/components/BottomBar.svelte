<script lang="ts">
const { children } = $props();
</script>

<div class="h-24 bg-gray-900/90 border-t border-gray-700 p-4 flex items-center justify-between backdrop-blur-md absolute bottom-0 left-0 right-0 z-50">
	{@render children()}
</div>
