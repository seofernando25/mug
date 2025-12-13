<script lang="ts">
import { fade, fly } from "svelte/transition";
import { authClient } from "$lib/auth-client";
import { goto } from "$app/navigation";
import Waves from "$lib/components/Waves.svelte";
import BottomBar from "$lib/components/BottomBar.svelte";

const sessionData = authClient.useSession();
const currentUser = $derived($sessionData.data?.user);

const menuItems = [
	{ label: "SOLO", href: "/solo", color: "text-purple-400", desc: "Play standard rhythm game" },
	{ label: "MULTIPLAYER", href: "/multiplayer", color: "text-cyan-400", desc: "Compete with others online" },
	{ label: "EDITOR", href: "/level-creator", color: "text-yellow-400", desc: "Create your own charts" },
	{ label: "SETTINGS", href: "/config", color: "text-gray-400", desc: "Configure game options" },
];

let hoveredIndex = $state<number | null>(null);
</script>

<svelte:head>
	<title>Home - MUG</title>
</svelte:head>

<div class="fixed inset-0 flex overflow-hidden bg-gray-900 text-white font-sans select-none">
	<!-- Background -->
	<div class="absolute inset-0 z-0">
		<Waves />
		<div class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent"></div>
	</div>

	<!-- Content -->
	<div class="relative z-10 flex w-full h-full pb-24">
		<!-- Left: Branding -->
		<div class="w-1/2 flex flex-col justify-center pl-24" in:fly={{ x: -50, duration: 800 }}>
			<h1 class="text-9xl font-black italic tracking-tighter text-white drop-shadow-2xl">
				MUG
				<span class="text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-cyan-400">.</span>
			</h1>
			<p class="text-2xl text-gray-400 font-light mt-4 tracking-widest uppercase">
				Rhythm Game Engine
			</p>
			
			<div class="mt-12 h-16 transition-opacity duration-300 {hoveredIndex !== null ? 'opacity-100' : 'opacity-0'}">
				<p class="text-xl text-white font-bold tracking-wider border-l-4 border-white pl-4">
					{hoveredIndex !== null ? menuItems[hoveredIndex].desc : ''}
				</p>
			</div>
		</div>

		<!-- Right: Menu -->
		<div class="w-1/2 flex flex-col justify-center items-end pr-24 space-y-2">
			{#each menuItems as item, index}
				<a
					href={item.href}
					class="group relative flex items-center justify-end w-full"
					onmouseenter={() => hoveredIndex = index}
					onmouseleave={() => hoveredIndex = null}
				>
					<!-- Hover Effect Background -->
					<div 
						class="absolute right-0 h-full bg-gradient-to-l from-white/10 to-transparent transition-all duration-300 ease-out"
						style:width={hoveredIndex === index ? '100%' : '0%'}
					></div>

					<!-- Text -->
					<span 
						class="text-6xl font-black italic tracking-tighter transition-all duration-300 z-10 
						{hoveredIndex === index ? `${item.color} translate-x-[-20px] scale-105` : 'text-gray-500'}"
					>
						{item.label}
					</span>
				</a>
			{/each}

			<button
				onclick={async () => {
					await authClient.signOut();
					goto('/');
				}}
				class="mt-12 text-lg text-red-500 font-bold hover:text-red-400 hover:underline uppercase tracking-widest transition"
			>
				Log Out
			</button>
		</div>
	</div>

	<!-- Bottom Bar -->
	<BottomBar>
		<div class="flex items-center gap-4">
			{#if currentUser}
				<div class="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
					{#if currentUser.image}
						<img src={currentUser.image} alt="Avatar" class="w-10 h-10 rounded-full border-2 border-purple-500" />
					{:else}
						<div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500"></div>
					{/if}
					<div>
						<div class="text-sm font-bold text-white">{currentUser.name || currentUser.username}</div>
						<div class="text-xs text-cyan-300 font-mono tracking-wider">ONLINE</div>
					</div>
				</div>
			{/if}
		</div>

				<div class="flex-1 px-8">

					<!-- Spacer / Future News Ticker? -->

				</div>

			</BottomBar>

		</div>

		