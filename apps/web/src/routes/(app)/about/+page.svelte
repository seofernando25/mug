<script lang="ts">
import { fade, fly } from "svelte/transition";
</script>

<svelte:head>
	<title>About - MUG</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-12 pb-12" in:fade={{ duration: 300 }}>
	<!-- Header -->
	<header class="text-left space-y-2">
		<h1 class="text-7xl font-black italic tracking-tighter text-white drop-shadow-2xl">
			ABOUT<span class="text-cyan-400">.</span>
		</h1>
		<p class="text-gray-400 font-bold uppercase tracking-[0.3em] text-sm ml-1">
			Project Information & Legal
		</p>
	</header>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Description Section -->
		<section 
			class="p-8 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl space-y-6 shadow-xl md:col-span-2"
			in:fly={{ y: 20, delay: 100, duration: 400 }}
		>
			<h2 class="text-xs font-black uppercase tracking-[0.4em] text-cyan-400 leading-none">The Project</h2>
			<div class="space-y-4">
				<p class="text-xl font-bold text-gray-100 leading-relaxed italic">
					MUG is a free-to-win modern yet familiar online rhythm game. 
				</p>
				<p class="text-gray-400 leading-relaxed">
					Play multiplayer games against friends and foes all over the world, or claim a spot on the leaderboards – the rhythm future is yours! Built with cutting-edge web technologies to provide a lag-free, high-fidelity experience directly in your browser.
				</p>
			</div>
		</section>

		<!-- Legal Links Section -->
		<section 
			class="p-8 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl space-y-6 shadow-xl md:col-span-2"
			in:fly={{ y: 20, delay: 200, duration: 400 }}
		>
			<h2 class="text-xs font-black uppercase tracking-[0.4em] text-purple-400 leading-none">Legal & Community</h2>
			
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
				<a
					href="/about/terms"
					class="group p-6 bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 rounded-2xl transition-all duration-300"
				>
					<span class="block text-sm font-black uppercase tracking-widest text-gray-500 group-hover:text-purple-400 mb-1 transition-colors">Usage Agreement</span>
					<span class="text-xl font-black italic text-white group-hover:translate-x-1 inline-block transition-transform">TERMS OF USE</span>
				</a>

				<a
					href="/about/privacy"
					class="group p-6 bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 rounded-2xl transition-all duration-300"
				>
					<span class="block text-sm font-black uppercase tracking-widest text-gray-500 group-hover:text-cyan-400 mb-1 transition-colors">Data Safety</span>
					<span class="text-xl font-black italic text-white group-hover:translate-x-1 inline-block transition-transform">PRIVACY POLICY</span>
				</a>

				<a
					href="/about/rules"
					class="group p-6 bg-white/5 hover:bg-pink-500/10 border border-white/5 hover:border-pink-500/30 rounded-2xl transition-all duration-300"
				>
					<span class="block text-sm font-black uppercase tracking-widest text-gray-500 group-hover:text-pink-400 mb-1 transition-colors">Code of Conduct</span>
					<span class="text-xl font-black italic text-white group-hover:translate-x-1 inline-block transition-transform">COMMUNITY RULES</span>
				</a>

				<a
					href="/about/copyright"
					class="group p-6 bg-white/5 hover:bg-yellow-500/10 border border-white/5 hover:border-yellow-500/30 rounded-2xl transition-all duration-300"
				>
					<span class="block text-sm font-black uppercase tracking-widest text-gray-500 group-hover:text-yellow-400 mb-1 transition-colors">DMCA & IP</span>
					<span class="text-xl font-black italic text-white group-hover:translate-x-1 inline-block transition-transform">COPYRIGHT</span>
				</a>
			</div>
		</section>
	</div>
</div>