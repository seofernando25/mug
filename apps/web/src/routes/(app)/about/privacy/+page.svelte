<script lang="ts">
import { fade, fly } from "svelte/transition";
import { printElement } from "$lib/utils";

const GAME_NAME = "MUG";
const COMPANY_NAME = "MUG Inc.";
const WEBSITE_URL = "https://mug.rocks";
const CONTACT_EMAIL = "contact@mug.rocks";
const LAST_UPDATED = "May 18, 2025";

let privacyContainer: HTMLDivElement | null = $state(null);

function handlePrint() {
	printElement(privacyContainer, `${GAME_NAME} - Privacy Policy`);
}
</script>

<svelte:head>
	<title>Privacy Policy - {GAME_NAME}</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-12 pb-12" in:fade={{ duration: 300 }}>
	<!-- Header -->
	<header class="flex justify-between items-end gap-4">
		<div class="space-y-2">
			<h1 class="text-6xl font-black italic tracking-tighter text-white drop-shadow-2xl">
				PRIVACY<span class="text-cyan-400">.</span>
			</h1>
			<p class="text-gray-400 font-bold uppercase tracking-[0.3em] text-sm ml-1">
				Data Usage & Protection
			</p>
		</div>
		
		<button
			class="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all mb-2"
			onclick={handlePrint}
		>
			Print Document
		</button>
	</header>

	<!-- Content Card -->
	<div 
		class="p-10 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl shadow-2xl prose prose-invert prose-cyan max-w-none"
		in:fly={{ y: 20, delay: 100, duration: 400 }}
	>
		<div bind:this={privacyContainer} class="legal-content text-gray-400">
			<h1 class="hidden-from-view">{GAME_NAME} - Privacy Policy</h1>

			<p class="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-8">
				Last Updated: {LAST_UPDATED}
			</p>

			<p class="text-gray-200 leading-relaxed text-lg italic mb-8">
				We are committed to being transparent about the information we collect, how we use it, and the
				controls you have over your personal information.
			</p>

			<p class="mb-8">
				In addition to this policy, please also make sure to visit and understand our Terms of Service,
				located at <a href="/about/terms" class="text-purple-400 hover:underline">Terms of Service</a>.
			</p>

			<h2 class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2">Introduction</h2>
			<p class="leading-relaxed">
				{GAME_NAME} is an online rhythm game provided by {COMPANY_NAME}. We offer solo gameplay with
				leaderboards, real-time multiplayer, and community features like chat and user-submitted
				beatmaps.
			</p>

			<h2 class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2">Information We Collect</h2>
			<ol class="list-decimal pl-6 space-y-6">
				<li>
					<strong class="text-gray-200">Guest Usage:</strong> We store a temporary identifier and collect technical data like IP address for session maintenance.
				</li>
				<li>
					<strong class="text-gray-200">Registration:</strong> We collect your Username (public), Email (private), and Password (secured using scrypt).
				</li>
				<li>
					<strong class="text-gray-200">User Profile:</strong> Optional Avatar and Country info that becomes publicly visible.
				</li>
				<li>
					<strong class="text-gray-200">Submitted Content:</strong> Beatmaps, charts, assets, and chat messages are stored and may be publicly accessible.
				</li>
				<li>
					<strong class="text-gray-200">Gameplay Data:</strong> Scores, accuracy, and replay data are collected and displayed on leaderboards.
				</li>
			</ol>

			<h2 class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2">How We Use Your Information</h2>
			<ul class="list-disc pl-6 space-y-2">
				<li>To operate and provide the Game Service.</li>
				<li>To manage your account and profile.</li>
				<li>To display leaderboards and community features.</li>
				<li>To troubleshoot technical issues and analyze trends.</li>
				<li>To enforce our Terms of Service.</li>
			</ul>

			<h2 class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2">Your Rights</h2>
			<p class="leading-relaxed">
				You have the right to access, update, and delete your personal information. You can manage most profile data through account settings or contact us for account deletion requests.
			</p>

			<h2 class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2">Data Security</h2>
			<p class="leading-relaxed border-l-2 border-cyan-500/30 pl-6 py-2 italic">
				We implement technical measures like encryption (TLS/HTTPS) to protect your data. While we strive for absolute security, no method of transmission is 100% secure.
			</p>

			<h2 class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2">Contact</h2>
			<p class="leading-relaxed">
				Email: <span class="text-cyan-400 font-bold">{CONTACT_EMAIL}</span>
			</p>
		</div>
	</div>

	<!-- Back Button -->
	<div class="flex justify-center pt-4">
		<a
			href="/about"
			class="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-bold text-sm uppercase tracking-widest text-gray-400 transition-all hover:text-white"
		>
			Return to About
		</a>
	</div>
</div>

<style lang="postcss">
	.hidden-from-view {
		display: none;
	}
</style>