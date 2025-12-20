<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { printElement } from '$lib/utils';

	const GAME_NAME = 'MUG';
	const COMPANY_NAME = 'MUG Inc.';
	const WEBSITE_URL = 'https://mug.rocks';
	const CONTACT_EMAIL = 'contact@mug.rocks';
	const COPYRIGHT_EMAIL = 'copyright@mug.rocks';
	const LAST_UPDATED = 'May 18, 2025';
	const JURISDICTION = 'Canada';

	let copyrightContainer: HTMLDivElement | null = $state(null);

	function handlePrint() {
		printElement(copyrightContainer, `${GAME_NAME} - Copyright Policy`);
	}
</script>

<svelte:head>
	<title>Copyright Policy - {GAME_NAME}</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-12 pb-12" in:fade={{ duration: 300 }}>
	<!-- Header -->
	<header class="flex justify-between items-end gap-4">
		<div class="space-y-2">
			<h1 class="text-6xl font-black italic tracking-tighter text-white drop-shadow-2xl">
				IP & COPYRIGHT<span class="text-yellow-500">.</span>
			</h1>
			<p class="text-gray-400 font-bold uppercase tracking-[0.3em] text-sm ml-1">
				Intellectual Property Protection
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
		class="p-10 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl shadow-2xl prose prose-invert prose-yellow max-w-none text-gray-400"
		in:fly={{ y: 20, delay: 100, duration: 400 }}
	>
		<div bind:this={copyrightContainer} class="legal-content">
			<h1 class="hidden-from-view">{GAME_NAME} - Copyright Policy</h1>

			<p class="text-yellow-500 font-bold uppercase tracking-widest text-xs mb-8">
				Last Updated: {LAST_UPDATED}
			</p>

			<p class="text-gray-200 leading-relaxed text-lg italic mb-8">
				We respect the intellectual property rights of others and expect our users to do the same.
			</p>

			<p class="mb-8 leading-relaxed">
				{GAME_NAME} allows users to upload content including audio and images. It is essential that all
				user-submitted content respects the intellectual property rights of others.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				Our Policy
			</h2>
			<ul class="list-disc pl-6 space-y-2 mb-8">
				<li>Address notices of claimed copyright infringement promptly.</li>
				<li>Remove or disable access to infringing material.</li>
				<li>Terminate accounts of repeat infringers.</li>
			</ul>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase text-yellow-500 border-b border-white/5 pb-2"
			>
				Reporting Infringements
			</h2>
			<p class="mb-4">
				If you believe content on our Service infringes your copyright, please send a notice
				containing:
			</p>
			<ol class="list-decimal pl-6 space-y-4">
				<li>Identification of the copyrighted work(s).</li>
				<li>Identification of the infringing material (URLs, beatmap titles, etc.).</li>
				<li>Your contact information (Name, address, email).</li>
				<li>A good faith statement that the use is not authorized.</li>
				<li>A statement under penalty of perjury that the info is accurate.</li>
			</ol>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				Counter-Notices
			</h2>
			<p class="mb-4 leading-relaxed italic border-l-2 border-yellow-500/30 pl-6 py-2">
				If your content was removed by mistake, you may send a counter-notice including
				identification of the removed content and a statement of good faith belief that it was a
				mistake.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				Contact Info
			</h2>
			<p class="leading-relaxed">
				Direct all IP-related inquiries to: <span class="text-yellow-500 font-bold"
					>{COPYRIGHT_EMAIL}</span
				>
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
