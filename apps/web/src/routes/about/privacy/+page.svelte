<script lang="ts">
	const GAME_NAME = 'MUG';
	const COMPANY_NAME = 'MUG Inc.';
	const WEBSITE_URL = 'https://mug.rocks';
	const CONTACT_EMAIL = 'contact@mug.rocks';
	const LAST_UPDATED = 'May 18, 2025';

	let privacyContainer: HTMLDivElement | null = $state(null);

	function downloadPrivacy() {
		if (privacyContainer) {
			const printWindow = window.open('', '_blank');
			if (printWindow) {
				printWindow.document.write(`
					<html>
						<head>
							<title>${GAME_NAME} - Privacy Policy</title>
							<style>
								body { font-family: Arial, sans-serif; padding: 20px; }
								h1 { font-size: 24px; margin-bottom: 20px; }
								h2 { font-size: 20px; margin-top: 30px; }
								p { margin-bottom: 15px; line-height: 1.5; }
							</style>
						</head>
						<body>
							${privacyContainer.innerHTML}
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
	<title>Privacy Policy - {GAME_NAME}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 bg-white text-black" bind:this={privacyContainer}>
	<h1 class="text-4xl font-bold mb-6 pt-4 text-gray-900">{GAME_NAME} - Privacy Policy</h1>

	<p class="text-base leading-7 mb-4 text-gray-700">
		<strong class="font-semibold text-gray-900">Last Updated:</strong>
		{LAST_UPDATED}
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		In addition to this policy, please also make sure to visit and understand our Terms of Service,
		located at <a href="/about/terms" class="text-blue-600 hover:underline">Terms of Service</a>.
	</p>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">Introduction</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		{GAME_NAME} is an online rhythm game provided by {COMPANY_NAME}. We offer solo gameplay with
		leaderboards, real-time multiplayer, and community features like chat and user-submitted
		beatmaps.
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		In order to offer these services to you, we collect, store, and process certain information. We
		are committed to being transparent about the information we collect, how we use it, and the
		controls you have over your personal information.
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		By using our Service, you confirm that you have read and understood the Terms of Service and
		this Privacy Policy, including how and why we use your information, and that your use of the
		Service is subject to the applicable Terms of Service and this Privacy Policy. If you do not
		agree with our practices, your choice is to limit the information you provide or stop using the
		Service.
	</p>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">Information We Collect</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		We collect information when you interact with our Service. The type of information depends on
		how you use the Service:
	</p>

	<ol class="list-decimal pl-6 mb-4 text-gray-700">
		<li class="mb-2">
			<strong>When you use the Service as a Guest:</strong>
			<ul class="list-disc pl-6 mt-2">
				<li>We store a temporary anonymous identifier for your guest session.</li>
				<li>
					We automatically collect your IP address and user agent (browser type, operating system)
					for technical purposes like maintaining your session and basic analytics.
				</li>
			</ul>
		</li>
		<li class="mb-2">
			<strong>When you register or upgrade to a full Account:</strong>
			<ul class="list-disc pl-6 mt-2">
				<li>
					We collect the information you provide directly:
					<ul class="list-disc pl-6 mt-2">
						<li>Your chosen Username (this is public).</li>
						<li>
							Your Email Address (private, used for login, verification, password reset, and account
							notifications).
						</li>
						<li>Your Password (stored using scrypt).</li>
					</ul>
				</li>
				<li>We associate your Guest progress (if any) with your new account.</li>
				<li>We record the date and time your account was created and last updated.</li>
				<li>
					We continue to collect your IP address and user agent information associated with your
					login sessions.
				</li>
			</ul>
		</li>
		<li class="mb-2">
			<strong>When you update your User Profile:</strong>
			<ul class="list-disc pl-6 mt-2">
				<li>
					You may optionally provide:
					<ul class="list-disc pl-6 mt-2">
						<li>A User-uploaded Avatar Image.</li>
						<li>Your Country (if you choose to set it).</li>
					</ul>
				</li>
				<li>
					Your Username, Avatar, Join Date (derived from creation date), and Country (if set) are
					publicly visible on your profile.
				</li>
			</ul>
		</li>
		<li class="mb-2">
			<strong>When you upload User Submitted Content:</strong>
			<ul class="list-disc pl-6 mt-2">
				<li>
					When you upload beatmap charts (`.json` files), audio files, background images, post in
					chat, send private messages, or submit comments/reports, the content you submit is
					collected and stored on our servers.
				</li>
				<li>
					Beatmap metadata (title, artist, etc.) and the charts/assets are publicly accessible or
					accessible by other players in the game.
				</li>
				<li>
					Chat messages (global and private) and comments are visible to the relevant participants
					or publicly on beatmap pages.
				</li>
				<li>Report submissions are accessible by you and designated administrators.</li>
				<li>This content is linked to your user account (or guest ID if submitted as a guest).</li>
			</ul>
		</li>
		<li class="mb-2">
			<strong>When you play the game and submit a score:</strong>
			<ul class="list-disc pl-6 mt-2">
				<li>
					Details on your game performance (score, combo, accuracy, judgment counts) are collected.
				</li>
				<li>
					Replay data, capturing your key inputs and timing during a play session, may also be
					collected (if implemented).
				</li>
				<li>
					This performance and replay data may be displayed publicly on song leaderboards and your
					user profile and is linked to your account.
				</li>
			</ul>
		</li>
		<li class="mb-2">
			<strong>Logging and Service Improvement:</strong>
			<ul class="list-disc pl-6 mt-2">
				<li>
					We automatically collect technical and usage information as you use the Service ("Log
					Data"). This may include your IP address, user agent, browser type, operating system,
					referral URLs, actions taken within the Service (e.g., pages visited, features used,
					gameplay events), and error information.
				</li>
				<li>
					This data is used to operate, maintain, and improve the Service, troubleshoot issues,
					monitor usage, and for basic analytics.
				</li>
				<li>We may use third-party services (like Sentry) for error logging.</li>
				<li>
					We may use aggregated, anonymized, or de-identified Log Data for public statistics or to
					show user activity (e.g., in activity feeds), but this data will not personally identify
					you.
				</li>
			</ul>
		</li>
		<li class="mb-2">
			<strong>No Client-Specific Hardware Data:</strong>
			<ul class="list-disc pl-6 mt-2">
				<li>
					As a web-based service, we do not collect specific hardware identifiers or client strings
					from your local machine beyond the standard user agent information provided by your
					browser.
				</li>
			</ul>
		</li>
		<li class="mb-2">
			<strong>No Anti-Cheat Data (Currently):</strong>
			<ul class="list-disc pl-6 mt-2">
				<li>
					Currently, we do not employ or collect data from specific anti-cheat software running on
					your device. (Note: If anti-cheat is implemented in the future, this policy will be
					updated to describe the data collected and its purpose).
				</li>
			</ul>
		</li>
	</ol>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">How We Use Your Information</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		We use the information we collect for the following purposes:
	</p>

	<ul class="list-disc pl-6 mb-4 text-gray-700">
		<li class="mb-2">
			To provide and operate the Service, including hosting gameplay, managing multiplayer sessions,
			and serving user-submitted content.
		</li>
		<li class="mb-2">
			To manage your user account, including registration, login, and guest account claiming.
		</li>
		<li class="mb-2">
			To display your user profile, avatar, and public information to other users.
		</li>
		<li class="mb-2">To display game leaderboards and your performance data.</li>
		<li class="mb-2">
			To enable and operate community features like chat, private messaging, and beatmap comments.
		</li>
		<li class="mb-2">To process and host user-submitted beatmap charts and assets.</li>
		<li class="mb-2">
			To communicate with you regarding your account, password resets, or service-related
			notifications (e.g., account suspension). We do not send unsolicited marketing emails.
		</li>
		<li class="mb-2">To monitor and analyze usage and trends to improve the Service.</li>
		<li class="mb-2">To troubleshoot technical issues and errors using Log Data.</li>
		<li class="mb-2">
			To enforce our Terms of Service and community rules, including investigating reports of abuse
			or cheating (if anti-cheat is implemented).
		</li>
		<li class="mb-2">To maintain an audit log of administrative actions for accountability.</li>
		<li class="mb-2">To respond to your inquiries and provide customer support.</li>
	</ul>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">How We Share Your Information</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		We only share your personal information in limited circumstances:
	</p>

	<ol class="list-decimal pl-6 mb-4 text-gray-700">
		<li class="mb-2">
			<strong>With Your Consent or When Made Public by You:</strong> Information you choose to make public
			on your profile (username, avatar, country, join date), user-submitted content (beatmaps, chat,
			comments), and gameplay performance data displayed on leaderboards and your profile are shared
			publicly with other users of the Service.
		</li>
		<li class="mb-2">
			<strong>With Service Providers:</strong> We may share information with third-party service providers
			who perform services on our behalf to operate the Service. Examples include cloud hosting providers
			(like Cloudflare D1/Turso, MinIO/R2/S3), email delivery services (for password resets), and potentially
			error logging services (like Sentry). These providers are granted access only to the information
			necessary to perform their services and are obligated to protect its confidentiality.
		</li>
		<li class="mb-2">
			<strong>For Legal Reasons:</strong> We may disclose your information if required to do so by law
			or in the good faith belief that such action is necessary to comply with a legal obligation, protect
			and defend our rights or property, prevent fraud, or protect the safety of users or the public.
		</li>
		<li class="mb-2">
			<strong>In Case of Business Transfer:</strong> If we are involved in a merger, acquisition, or
			sale of assets, your information may be transferred as part of that transaction, provided the new
			entity agrees to protect your personal information in a manner consistent with this Privacy Policy.
		</li>
	</ol>

	<p class="text-base leading-7 mb-4 text-gray-700">
		We do not sell or rent your personal information to third parties for their marketing purposes.
	</p>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">Your Rights and Control</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		You have certain rights regarding your personal information:
	</p>

	<ul class="list-disc pl-6 mb-4 text-gray-700">
		<li class="mb-2">
			<strong>Access and Update:</strong> You can access and update most of your profile information
			directly through your account settings within the Service.
		</li>
		<li class="mb-2">
			<strong>Data Portability:</strong> While we don't currently have a dedicated export feature,
			you can contact us at {CONTACT_EMAIL} to inquire about receiving a copy of the personal data we
			hold about you.
		</li>
		<li class="mb-2">
			<strong>Deletion:</strong> You have the right to request the deletion of your account and
			associated personal information. Please contact us at {CONTACT_EMAIL} to initiate this process.
			<ul class="list-disc pl-6 mt-2">
				<li>
					Note that some User Submitted Content you have made public (like beatmaps that others
					play) may not be permanently deleted or may be anonymized instead, to maintain the
					integrity and functionality of the Service for other users.
				</li>
				<li>
					We may also retain certain information where required by law or for legitimate interests
					(e.g., retaining necessary data to enforce our one-account-per-user rule to maintain
					leaderboard fairness, which will be stored in a way that cannot be used to identify you
					outside the Service).
				</li>
			</ul>
		</li>
	</ul>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">Data Security</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		We implement reasonable technical and organizational measures designed to protect your personal
		information from unauthorized access, disclosure, alteration, and destruction. These include
		using encryption (like TLS/HTTPS for connections), restricting access to our servers, and
		employing secure password handling via our authentication service.
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		However, no method of transmission over the Internet or method of electronic storage is 100%
		secure. Therefore, we cannot guarantee absolute security.
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		We also follow a policy of retaining data only as long as necessary for the purposes for which
		it was collected or as required by law, with regular purging of Log Data.
	</p>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">Cookies</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		We use cookies to manage your session state and login credentials across multiple sessions.
		Cookies are small text files stored on your device. By using our Service, you consent to our use
		of cookies for these essential functionalities. If you disable cookies in your browser, parts of
		the Service may not function correctly, including the login system.
	</p>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">Age Restrictions</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		The Service is not intended for users under the legal age of majority in their jurisdiction. We
		do not knowingly collect personal information from users under the legal age. If we become aware
		that we have collected personal information from a user under the legal age without parental
		consent, we will take steps to delete that information from our systems. If you believe we might
		have any information from or about a user under the legal age, please contact us at {CONTACT_EMAIL}.
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		If a report is made regarding a user who appears to be under the legal age of majority in their
		jurisdiction, their account and information may be deleted.
	</p>

	<h2 class="text-2xl font-semibold my-8 pt-4 text-gray-800">Contact Information</h2>

	<p class="text-base leading-7 mb-4 text-gray-700">
		If you have any questions about this Privacy Policy or our data practices, or if you wish to
		exercise your rights regarding your personal information (such as access or deletion requests),
		please contact us using the details below.
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		<strong>Email:</strong>
		{CONTACT_EMAIL}
	</p>

	<p class="text-base leading-7 mb-4 text-gray-700">
		We will endeavor to respond to your inquiries and requests in a timely manner.
	</p>
</div>

<div class="flex mt-8">
	<button
		class="ml-4 bg-purple-400 text-white px-4 py-2 rounded-md transition-all duration-300 hover:bg-purple-500"
		onclick={downloadPrivacy}
	>
		Download Privacy Policy
	</button>
</div>
