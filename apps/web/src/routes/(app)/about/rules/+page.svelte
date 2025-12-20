<script lang="ts">
const GAME_NAME = "MUG";
const CONTACT_EMAIL = "contact@mug.rocks";
const LAST_UPDATED = "May 18, 2025";
const AGE_REQUIREMENT = "13";
</script>

<svelte:head>
	<title>Community Rules - {GAME_NAME}</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-12 pb-12">
	<!-- Header -->
	<header class="text-left space-y-2">
		<h1 class="text-6xl font-black italic tracking-tighter text-white drop-shadow-2xl">
			RULES<span class="text-pink-500">.</span>
		</h1>
		<p class="text-gray-400 font-bold uppercase tracking-[0.3em] text-sm ml-1">
			Community Conduct Guidelines
		</p>
	</header>

	<!-- Intro Card -->
	<div 
		class="p-8 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl shadow-xl space-y-4"
	>
		<p class="text-pink-400 font-bold uppercase tracking-widest text-xs">
			Last Updated: {LAST_UPDATED}
		</p>
		<p class="text-gray-200 leading-relaxed text-lg italic border-l-2 border-pink-500/30 pl-6">
			These rules ensure {GAME_NAME} remains a fun, fair, and welcoming place for everyone. 
			Staff holds the final say in interpreting and enforcing these rules.
		</p>
	</div>

	<!-- Rules Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<section class="p-8 bg-gradient-to-br from-pink-600/20 to-purple-600/20 backdrop-blur-md border border-white/5 rounded-3xl space-y-4 shadow-lg">
			<h2 class="text-white font-black italic tracking-tight text-xl uppercase">Terms of Service</h2>
			<p class="text-gray-400 text-sm leading-relaxed">
				Breaking the Terms of Service results in immediate consequences. You must be <span class="text-white font-bold">{AGE_REQUIREMENT} years of age</span> or older to play.
			</p>
		</section>

		<section class="p-8 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 backdrop-blur-md border border-white/5 rounded-3xl space-y-4 shadow-lg">
			<h2 class="text-white font-black italic tracking-tight text-xl uppercase">Fair Play</h2>
			<p class="text-gray-400 text-sm leading-relaxed">
				<span class="text-white font-bold uppercase tracking-tighter">Do not cheat.</span> Using unauthorized methods, third-party programs, macros, or exploits to gain advantage is strictly prohibited.
			</p>
		</section>

		<section class="p-8 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 backdrop-blur-md border border-white/5 rounded-3xl space-y-4 shadow-lg">
			<h2 class="text-white font-black italic tracking-tight text-xl uppercase">Integrity</h2>
			<p class="text-gray-400 text-sm leading-relaxed">
				Each person may only have one registered account. Multi-accounting or misrepresenting skill levels to manipulate rankings is forbidden.
			</p>
		</section>

		<section class="p-8 bg-gradient-to-br from-red-600/20 to-orange-600/20 backdrop-blur-md border border-white/5 rounded-3xl space-y-4 shadow-lg">
			<h2 class="text-white font-black italic tracking-tight text-xl uppercase">Respect & Safety</h2>
			<p class="text-gray-400 text-sm leading-relaxed">
				Harassment, antagonism, discrimination, threats, and harmful conduct (including doxxing) have no place in our community.
			</p>
		</section>

		<section class="p-8 bg-gradient-to-br from-yellow-600/20 to-amber-600/20 backdrop-blur-md border border-white/5 rounded-3xl space-y-4 shadow-lg">
			<h2 class="text-white font-black italic tracking-tight text-xl uppercase">Content</h2>
			<p class="text-gray-400 text-sm leading-relaxed">
				{GAME_NAME} is an all-ages community. NSFW content, graphic violence, or shock content is not allowed in public areas.
			</p>
		</section>

		<section class="p-8 bg-gradient-to-br from-gray-600/20 to-gray-800/20 backdrop-blur-md border border-white/5 rounded-3xl space-y-4 shadow-lg">
			<h2 class="text-white font-black italic tracking-tight text-xl uppercase">Consequences</h2>
			<ul class="text-gray-400 text-[10px] uppercase font-black tracking-widest grid grid-cols-2 gap-2">
				<li class="bg-black/20 p-2 rounded">Content Removal</li>
				<li class="bg-black/20 p-2 rounded">Chat Silence</li>
				<li class="bg-black/20 p-2 rounded">Gameplay Restriction</li>
				<li class="bg-black/20 p-2 rounded">Account Ban</li>
			</ul>
		</section>
	</div>

	<!-- Reporting Card -->
	<div class="p-8 bg-white/5 border border-white/5 rounded-3xl shadow-xl space-y-4">
		<h2 class="text-white font-black italic tracking-tight text-xl uppercase">Reporting</h2>
		<p class="text-gray-400 leading-relaxed text-sm">
			Encountered a violation? Use the in-game reporting tools or contact us at <span class="text-pink-400 font-bold">{CONTACT_EMAIL}</span>. 
			Please let staff handle moderation; avoid backseat moderation or engaging with rule-breakers.
		</p>
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