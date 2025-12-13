<script lang="ts">
import { goto } from "$app/navigation";
import { authClient } from "$lib/auth-client";
import BottomBar from "$lib/components/BottomBar.svelte";

const { children } = $props();

const sessionData = authClient.useSession();
const currentUser = $derived($sessionData.data?.user);
</script>

<div class="flex flex-col h-full min-h-screen relative bg-gray-900 text-gray-100">
	<!-- Main Content -->
	<main class="flex-1 container mx-auto p-8 pb-32">
		{@render children()}
	</main>

	<!-- Unified Bottom Bar -->
	<BottomBar>
		<!-- Left: Navigation -->
		<div class="flex items-center gap-6">
			<a 
				href="/home" 
				class="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-cyan-400 hover:scale-105 transition-transform"
			>
				MUG
			</a>
			<a href="/home" class="font-bold text-gray-400 hover:text-white transition uppercase tracking-widest text-sm">
				Home
			</a>
		</div>

		<!-- Right: Controls -->
		<div class="flex items-center gap-6">
			{#if currentUser}
				<div class="flex items-center gap-3">
					<div class="text-right hidden md:block">
						<div class="text-xs text-gray-400 uppercase tracking-wider">Logged in as</div>
						<div class="text-sm font-bold text-white">{currentUser.name || currentUser.username}</div>
					</div>
					<button
						onclick={async () => {
							await authClient.signOut();
							goto('/');
						}}
						class="px-4 py-2 rounded bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 hover:text-red-200 text-xs font-bold uppercase tracking-widest transition"
					>
						Logout
					</button>
				</div>
			{:else}
				<div class="flex items-center gap-4 text-sm font-bold tracking-widest uppercase">
					<a href="/login" class="text-purple-400 hover:text-purple-300">Login</a>
					<a href="/register" class="text-cyan-400 hover:text-cyan-300">Register</a>
				</div>
			{/if}
		</div>
	</BottomBar>
</div>
