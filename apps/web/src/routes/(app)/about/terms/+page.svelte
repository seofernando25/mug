<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { printElement } from '$lib/utils';

	const GAME_NAME = 'MUG';
	const COMPANY_NAME = 'MUG Inc.';
	const WEBSITE_URL = 'https://mug.rocks';
	const JURISDICTION = 'Canada';
	const CONTACT_EMAIL = 'contact@mug.rocks';
	const LAST_UPDATED = 'May 18, 2025';

	let termsContainer: HTMLDivElement | null = $state(null);

	function handlePrint() {
		printElement(termsContainer, `${GAME_NAME} - Terms of Service`);
	}
</script>

<svelte:head>
	<title>Terms of Use - {GAME_NAME}</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-12 pb-12" in:fade={{ duration: 300 }}>
	<!-- Header -->
	<header class="flex justify-between items-end gap-4">
		<div class="space-y-2">
			<h1 class="text-6xl font-black italic tracking-tighter text-white drop-shadow-2xl">
				TERMS<span class="text-purple-500">.</span>
			</h1>
			<p class="text-gray-400 font-bold uppercase tracking-[0.3em] text-sm ml-1">
				Legal Usage Agreement
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
		class="p-10 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl shadow-2xl prose prose-invert prose-purple max-w-none"
		in:fly={{ y: 20, delay: 100, duration: 400 }}
	>
		<div bind:this={termsContainer} class="legal-content">
			<h1 class="hidden-from-view">{GAME_NAME} - Terms of Service</h1>

			<p class="text-purple-400 font-bold uppercase tracking-widest text-xs mb-8">
				Last Updated: {LAST_UPDATED}
			</p>

			<p class="text-gray-200 leading-relaxed text-lg italic">
				Please read these Terms of Service carefully before using the service offered by {COMPANY_NAME}
				("we", "us", or "our").
			</p>

			<p class="text-gray-400 leading-relaxed">
				By accessing or using the website located at {WEBSITE_URL} (the "Website") or the {GAME_NAME}
				game client or web application (collectively, the "Service"), you agree to be bound by these Terms
				of Service ("Terms"). If you do not agree to all the terms and conditions of this agreement, then
				you may not access the Service.
			</p>

			<p class="text-gray-400 leading-relaxed">
				As a condition of your use of the Service, you warrant that you will not use the Service, or
				any of the content obtained from the Service, for any purpose that is unlawful or prohibited
				by these Terms.
			</p>

			<p class="text-gray-400 leading-relaxed">
				In addition to these Terms, please also make sure to visit and understand our Privacy
				Policy, located at <a href="/about/privacy" class="text-cyan-400 hover:underline"
					>Privacy Policy</a
				>.
			</p>

			<p class="text-gray-400 leading-relaxed">
				If you violate any of these Terms of Service, your permission to use the Service may
				automatically terminate.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				1. Description of Service
			</h2>
			<p class="text-gray-400 leading-relaxed">
				{GAME_NAME} provides an online rhythm game service, including solo gameplay with leaderboards,
				head-to-head multiplayer gameplay, community features such as chat and beatmap comments, and allows
				users to access and upload user-created content. The Service is provided free-to-win.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				2. Modifications to Terms
			</h2>
			<p class="text-gray-400 leading-relaxed">
				We may change the terms and conditions of these Terms from time to time. We will notify you
				of any material changes by posting the new Terms on the Website. Your continued use of the
				Service constitutes agreement.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				3. Modifications to Service
			</h2>
			<p class="text-gray-400 leading-relaxed">
				We reserve the right to modify or discontinue the Service, or any part of it, temporarily or
				permanently, with or without notice to you.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				4. Disclaimer of Warranties
			</h2>
			<p class="text-gray-400 leading-relaxed italic border-l-2 border-purple-500/30 pl-6 py-2">
				USER EXPRESSLY AGREES THAT USE OF THE SERVICE IS AT USER'S SOLE RISK. THE SERVICE IS
				PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE DISCLAIM ALL WARRANTIES OF ANY KIND,
				EXPRESS OR IMPLIED.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				5. Limitation of Liability
			</h2>
			<p class="text-gray-400 leading-relaxed">
				IN NO EVENT SHALL {COMPANY_NAME} BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE,
				OR CONSEQUENTIAL DAMAGES WHATSOEVER.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				6. Indemnity
			</h2>
			<p class="text-gray-400 leading-relaxed">
				You agree to defend, indemnify and hold harmless {COMPANY_NAME} from any and all claims arising
				from your use of and access to the Service or violation of these Terms.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				7. Account System
			</h2>
			<p class="text-gray-400 leading-relaxed">
				You may access the Service as a Guest. You have the option to register a permanent account.
				You are responsible for maintaining the confidentiality of your credentials.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				8. Rules of Conduct
			</h2>
			<ul class="list-disc pl-6 space-y-2 text-gray-400">
				<li>No unlawful or hateful content.</li>
				<li>No copyright infringement.</li>
				<li>No cheating or exploiting bugs.</li>
				<li>No interference with servers or networks.</li>
			</ul>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				9. User Submissions
			</h2>
			<p class="text-gray-400 leading-relaxed">
				You retain ownership of your submissions but grant us a worldwide, non-exclusive,
				royalty-free license to use, display, and perform the content in connection with the
				Service.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				10. Termination
			</h2>
			<p class="text-gray-400 leading-relaxed">
				We may terminate your account or use of the Service for any reason, including violation of
				these Terms.
			</p>

			<h2
				class="text-white font-black italic tracking-tight text-2xl mt-12 mb-4 uppercase border-b border-white/5 pb-2"
			>
				11. Governing Law
			</h2>
			<p class="text-gray-400 leading-relaxed">
				These Terms shall be governed by the laws of {JURISDICTION}.
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
