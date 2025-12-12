<script lang="ts">
	const GAME_NAME = 'MUG';
	const COMPANY_NAME = 'MUG Inc.';
	const WEBSITE_URL = 'https://mug.rocks';
	const CONTACT_EMAIL = 'contact@mug.rocks';
	const COPYRIGHT_EMAIL = 'copyright@mug.rocks';
	const LAST_UPDATED = 'May 18, 2025';
	const JURISDICTION = 'Canada';

	let copyrightContainer: HTMLDivElement | null = $state(null);

	function downloadCopyright() {
		if (copyrightContainer) {
			const printWindow = window.open('', '_blank');
			if (printWindow) {
				printWindow.document.write(`
					<html>
						<head>
							<title>${GAME_NAME} - Copyright Policy</title>
							<style>
								body { font-family: Arial, sans-serif; padding: 20px; }
								h1 { font-size: 24px; margin-bottom: 20px; }
								h2 { font-size: 20px; margin-top: 30px; }
								p { margin-bottom: 15px; line-height: 1.5; }
							</style>
						</head>
						<body>
							${copyrightContainer.innerHTML}
						</body>
					</html>
				`);
				printWindow.document.close();
				printWindow.print();
				printWindow.close();
			}
		}
	}
</script>

<svelte:head>
	<title>Copyright Policy - {GAME_NAME}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 bg-white text-black" bind:this={copyrightContainer}>
	<h1 class="text-4xl font-bold mb-6 pt-4 text-gray-900">{GAME_NAME} - Copyright Policy</h1>

	<p class="text-base leading-7 mb-4 text-gray-700">
		<strong class="font-semibold text-gray-900">Last Updated:</strong>
		{LAST_UPDATED}
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		This document outlines our policy regarding copyright infringement on the {GAME_NAME} service ({WEBSITE_URL}).
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		{GAME_NAME} is a community-oriented game where users can create and upload their own beatmap charts
		and associated assets, including audio files and background images. While we encourage creativity
		and the sharing of content, it is essential that all user-submitted content respects the intellectual
		property rights of others.
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">It is our policy to:</p>

	<ul class="list-disc pl-6 mb-4 text-gray-700">
		<li class="mb-2">
			Promptly address notices of claimed copyright infringement that we believe in good faith may
			contain material that infringes the copyrights of third parties.
		</li>
		<li class="mb-2">Remove or disable access to infringing content.</li>
		<li class="mb-2">Terminate the accounts of users who are found to be repeat infringers.</li>
	</ul>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">Reporting Copyright Infringements</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		If you believe that content residing on or accessible through the {GAME_NAME} service infringes your
		copyright, please send a notice of claimed copyright infringement containing the following information
		to the contact details listed below. Please note that you may be liable for damages (including costs
		and attorneys' fees) if you materially misrepresent that content is infringing your copyright.
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">Your notice should include:</p>

	<ol class="list-decimal pl-6 mb-4 text-gray-700">
		<li class="mb-2">
			Sufficient information to identify the copyrighted work(s) claimed to have been infringed. If
			multiple works are involved, a representative list is acceptable.
		</li>
		<li class="mb-2">
			Sufficient information to identify the material on our service that is claimed to be
			infringing, and that you want removed or access disabled. Please provide enough detail to
			allow us to locate the material (e.g., specific beatmap title and artist, username of the
			uploader, URLs if applicable).
		</li>
		<li class="mb-2">
			Your contact information, such as your full name, address, telephone number, and email
			address.
		</li>
		<li class="mb-2">
			A statement that you have a good faith belief that the use of the material in the manner
			complained of is not authorized by the copyright owner, its agent, or the law.
		</li>
		<li class="mb-2">
			A statement that the information in the notification is accurate, and under penalty of
			perjury, that you are authorized to act on behalf of the owner of the copyright that is
			allegedly infringed.
		</li>
	</ol>

	<p class="text-base leading-7 mb-4 text-gray-700">
		Once we receive a complete and proper notice of claimed copyright infringement, or if we
		otherwise come to believe in good faith that content on the Service may contain infringing
		material, it is our policy to:
	</p>

	<ul class="list-disc pl-6 mb-4 text-gray-700">
		<li class="mb-2">Remove or disable access to the content identified in the notice.</li>
		<li class="mb-2">
			Notify the user who provided the content that we have removed or disabled access to it.
		</li>
		<li class="mb-2">
			Terminate the accounts of users who are repeat infringers in appropriate circumstances.
		</li>
	</ul>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">Submitting Counter-Notices</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		If you believe that the content you provided was removed or access disabled as a result of a
		mistake or misidentification, you may send us a counter-notice containing the following
		information to the contact details listed below:
	</p>

	<ol class="list-decimal pl-6 mb-4 text-gray-700">
		<li class="mb-2">
			Sufficient information to identify the content that has been removed or to which access has
			been disabled and the location at which the material appeared before it was removed or access
			to it was disabled.
		</li>
		<li class="mb-2">Your name, address, telephone number, and email address.</li>
		<li class="mb-2">
			A statement that you consent to the jurisdiction of the courts in {JURISDICTION} and that you will
			accept service of process from the person who provided the original notification of the alleged
			infringement.
		</li>
		<li class="mb-2">
			A statement under penalty of perjury that you have a good faith belief that the material was
			removed or disabled as a result of mistake or a misidentification of the material to be
			removed or disabled.
		</li>
	</ol>

	<p class="text-base leading-7 mb-4 text-gray-700">
		Upon receiving a counter-notice, we may send a copy of the counter-notice to the original
		complaining party. The removed content may potentially be replaced or access restored in 10 to
		14 business days or more after receiving the counter-notice, at our sole discretion, unless the
		copyright owner files a legal action seeking a court order against you.
	</p>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">Copyright Contact Information</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		Please send all notices of claimed copyright infringement and counter-notices to:
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		<strong>Email:</strong>
		{COPYRIGHT_EMAIL}
	</p>
</div>

<div class="flex mt-8">
	<button
		class="ml-4 bg-purple-400 text-white px-4 py-2 rounded-md transition-all duration-300 hover:bg-purple-500"
		onclick={downloadCopyright}
	>
		Download Copyright Policy
	</button>
</div>
