<script lang="ts">
	import { onMount } from 'svelte';
	import Waves from '../home/Waves.svelte';
	import JSZip from 'jszip';

	let isDragging = $state(false);
	let importedFile: File | null = $state(null);
	let convertedData: string | null = $state(null);
	let errorMessage = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let isConverting = $state(false);
	let conversionProgress = $state<string>('');

	interface OsuHitObject {
		x: number;
		y: number;
		time: number;
		type: number;
		hitSound: number;
		objectParams?: string;
		hitSample?: string;
	}

	interface OsuTimingPoint {
		time: number;
		beatLength: number;
		meter: number;
		sampleSet: number;
		sampleIndex: number;
		volume: number;
		uninherited: number;
		effects: number;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
		errorMessage = null;

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		if (!file.name.endsWith('.osz') && !file.name.endsWith('.mug')) {
			errorMessage = 'Please drop a valid .osz or .mug file';
			return;
		}

		importedFile = file;
		if (file.name.endsWith('.osz')) {
			convertOszFile(file);
		} else if (file.name.endsWith('.mug')) {
			importMugFile(file);
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const file = input.files[0];
		if (!file.name.endsWith('.osz') && !file.name.endsWith('.mug')) {
			errorMessage = 'Please select a valid .osz or .mug file';
			return;
		}

		importedFile = file;
		if (file.name.endsWith('.osz')) {
			convertOszFile(file);
		} else if (file.name.endsWith('.mug')) {
			importMugFile(file);
		}
	}

	function triggerFileInput() {
		fileInput.click();
	}

	function parseOsuFile(content: string) {
		const sections: { [key: string]: string[] } = {};
		let currentSection = '';
		
		// Split content into sections
		content.split('\n').forEach(line => {
			line = line.trim();
			if (line.startsWith('[') && line.endsWith(']')) {
				currentSection = line.slice(1, -1);
				sections[currentSection] = [];
			} else if (line && currentSection) {
				sections[currentSection].push(line);
			}
		});

		// Parse metadata
		const metadata: { [key: string]: string } = {};
		sections['Metadata']?.forEach(line => {
			const [key, value] = line.split(':').map(s => s.trim());
			if (key && value) metadata[key] = value;
		});

		// Also check General section for audio filename
		sections['General']?.forEach(line => {
			const [key, value] = line.split(':').map(s => s.trim());
			if (key && value) {
				if (key === 'AudioFilename') {
					metadata['AudioFilename'] = value;
				}
			}
		});

		console.log('Parsed metadata:', metadata);

		// Parse timing points
		const timingPoints: OsuTimingPoint[] = [];
		sections['TimingPoints']?.forEach(line => {
			const [time, beatLength, meter, sampleSet, sampleIndex, volume, uninherited, effects] = line.split(',').map(Number);
			timingPoints.push({ time, beatLength, meter, sampleSet, sampleIndex, volume, uninherited, effects });
		});

		// Parse hit objects
		const hitObjects: OsuHitObject[] = [];
		sections['HitObjects']?.forEach(line => {
			const [x, y, time, type, hitSound, ...rest] = line.split(',');
			const obj: OsuHitObject = {
				x: Number(x),
				y: Number(y),
				time: Number(time),
				type: Number(type),
				hitSound: Number(hitSound)
			};
			if (rest.length > 0) obj.objectParams = rest.join(',');
			hitObjects.push(obj);
		});

		return { metadata, timingPoints, hitObjects };
	}

	function convertToMugFormat(osuData: { metadata: { [key: string]: string }, timingPoints: OsuTimingPoint[], hitObjects: OsuHitObject[] }) {
		// Calculate BPM from timing points
		const bpm = osuData.timingPoints[0] ? Math.round(60000 / osuData.timingPoints[0].beatLength) : 120;

		// Convert hit objects to MUG format
		const hitObjects = osuData.hitObjects.map(obj => {
			// Convert x coordinate to lane (0-3)
			const lane = Math.floor((obj.x / 512) * 4);
			
			// Check if it's a hold note
			const isHold = (obj.type & 128) !== 0;
			
			if (isHold && obj.objectParams) {
				const [endTime] = obj.objectParams.split(',').map(Number);
				return {
					time: obj.time,
					lane: Math.min(3, Math.max(0, lane)),
					type: 'hold',
					duration: endTime - obj.time
				};
			} else {
				return {
					time: obj.time,
					lane: Math.min(3, Math.max(0, lane)),
					type: 'tap'
				};
			}
		});

		// Create MUG format
		const mugData = {
			metadata: {
				title: osuData.metadata['Title'] || 'Unknown Title',
				artist: osuData.metadata['Artist'] || 'Unknown Artist',
				audioFilename: osuData.metadata['AudioFilename'] || 'audio.mp3',
				bpm: bpm,
				previewStartTime: 0
			},
			charts: [
				{
					difficultyName: osuData.metadata['Version'] || 'Normal',
					lanes: 4,
					noteScrollSpeed: 1.0,
					lyrics: [],
					hitObjects: hitObjects,
					mockLeaderboard: [
						{ name: "DJMax", score: 150000 },
						{ name: "RhythmFan", score: 140000 },
						{ name: "OSUConvert", score: 120000 }
					]
				}
			]
		};

		return mugData;
	}

	async function convertOszFile(file: File) {
		try {
			isConverting = true;
			errorMessage = null;
			conversionProgress = 'Loading .osz file...';
			
			// Read the .osz file
			const oszZip = await JSZip.loadAsync(file);
			
			// Find all .osu files
			const osuFiles = Object.entries(oszZip.files).filter(([name]) => name.endsWith('.osu'));
			if (osuFiles.length === 0) {
				throw new Error('No .osu files found in the .osz file');
			}

			conversionProgress = 'Converting difficulty levels...';

			// Convert each .osu file
			const charts = [];
			let songMetadata = null;
			let audioFilename = null;

			// First pass: find the audio filename
			for (const [filename, osuFile] of osuFiles) {
				const content = await osuFile.async('text');
				const osuData = parseOsuFile(content);
				if (osuData.metadata['AudioFilename']) {
					audioFilename = osuData.metadata['AudioFilename'];
					console.log('Found audio filename:', audioFilename);
					break;
				}
			}

			// Second pass: convert all charts
			for (const [filename, osuFile] of osuFiles) {
				const content = await osuFile.async('text');
				const osuData = parseOsuFile(content);
				const mugData = convertToMugFormat(osuData);
				
				// Store metadata from the first chart
				if (!songMetadata) {
					songMetadata = mugData.metadata;
				}
				
				charts.push(mugData.charts[0]);
			}

			if (!songMetadata) {
				throw new Error('Could not extract song metadata');
			}

			if (!audioFilename) {
				throw new Error('Could not find audio filename in metadata');
			}

			// Find the audio file
			const audioFile = Object.entries(oszZip.files).find(([name]) => 
				name === audioFilename || name.endsWith('/' + audioFilename)
			);

			if (!audioFile) {
				console.log('Available files:', Object.keys(oszZip.files));
				throw new Error(`Audio file "${audioFilename}" not found in the .osz file`);
			}

			// Create the final MUG data
			const mugData = {
				metadata: songMetadata,
				charts: charts
			};

			// Create a zip file for the converted data
			const zip = new JSZip();
			
			// Add the song.json file
			zip.file('song.json', JSON.stringify(mugData, null, 2));

			// Add the audio file
			const audioContent = await audioFile[1].async('uint8array');
			zip.file(audioFilename, audioContent);

			conversionProgress = 'Creating .mug file...';

			// Generate the zip file
			const zipBlob = await zip.generateAsync({ type: 'blob' });

			// Create a directory name from the song title
			const songDir = songMetadata.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '');

			conversionProgress = 'Installing song...';

			// Create FormData to send to server
			const formData = new FormData();
			formData.append('songData', new Blob([JSON.stringify(mugData)], { type: 'application/json' }));
			formData.append('audioFile', new Blob([audioContent], { type: 'audio/mpeg' }), audioFilename);
			formData.append('songDir', songDir);

			// Send to server for installation
			const response = await fetch('/api/install-song', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`Failed to install song: ${error}`);
			}

			conversionProgress = '';
			errorMessage = `Song "${songMetadata.title}" has been successfully installed!`;
			convertedData = null; // Clear the converted data since we installed it directly
		} catch (error) {
			errorMessage = 'Error converting file: ' + error;
			console.error('Conversion error:', error);
		} finally {
			isConverting = false;
		}
	}

	async function importMugFile(file: File) {
		try {
			isConverting = true;
			errorMessage = null;
			conversionProgress = 'Loading .mug file...';

			const mugZip = await JSZip.loadAsync(file);

			const songJsonFile = mugZip.file('song.json');
			if (!songJsonFile) {
				throw new Error('song.json not found in .mug file');
			}
			const songJsonContent = await songJsonFile.async('text');
			const songData = JSON.parse(songJsonContent);

			const audioFilename = songData.metadata.audioFilename;
			if (!audioFilename) {
				throw new Error('audioFilename not found in song.json metadata');
			}

			const audioFile = mugZip.file(audioFilename);
			if (!audioFile) {
				console.log('Available files in .mug:', Object.keys(mugZip.files));
				throw new Error(`Audio file "${audioFilename}" not found in .mug file`);
			}
			const audioContent = await audioFile.async('uint8array');

			// Create a directory name from the song title
			const songDir = songData.metadata.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '');

			conversionProgress = 'Installing song...';

			// Create FormData to send to server
			const formData = new FormData();
			formData.append('songData', new Blob([songJsonContent], { type: 'application/json' }));
			formData.append('audioFile', new Blob([audioContent], { type: audioFile.name.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav' }), audioFilename); // Guess audio type based on extension
			formData.append('songDir', songDir);

			// Send to server for installation
			const response = await fetch('/api/install-song', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`Failed to install song: ${error}`);
			}

			conversionProgress = '';
			errorMessage = `Song "${songData.metadata.title}" has been successfully installed!`;
			convertedData = null; // Clear the converted data since we installed it directly
		} catch (error) {
			errorMessage = 'Error importing file: ' + error;
			console.error('Import error:', error);
		} finally {
			isConverting = false;
		}
	}

	function downloadConvertedFile() {
		if (!convertedData) return;

		const a = document.createElement('a');
		a.href = convertedData;
		a.download = importedFile?.name.replace('.osz', '.mug') || 'converted.mug';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
</script>

<svelte:head>
	<title>Level Creator - MUG</title>
</svelte:head>

<div class="flex flex-col h-full pt-8 isolate">
	<div class="fixed top-0 left-0 w-screen h-screen z-[-1] overflow-visible">
		<Waves />
	</div>

	<div class="w-full max-w-4xl mx-auto px-4">
		<h1 class="text-4xl font-bold mb-10 text-gray-200 text-center">Level Creator</h1>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Create Custom Level Button -->
			<button
				class="group block bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out hover:-translate-y-2"
			>
				<h2 class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 512 512"
						class="w-8 h-8 mr-3"
						fill="currentColor"
					>
						<path
							d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"
						/>
					</svg>
					Create Custom Level
				</h2>
				<p class="text-md text-indigo-100">Design your own rhythm game level from scratch</p>
			</button>

			<!-- Import Level Section -->
			<div
				class="group block bg-gradient-to-r from-yellow-500 to-amber-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out"
			>
				<h2 class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 512 512"
						class="w-8 h-8 mr-3"
						fill="currentColor"
					>
						<path
							d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"
						/>
					</svg>
					Import Level
				</h2>
				<p class="text-md text-amber-100 mb-4">Import and convert .osz files to MUG format</p>

				<input
					type="file"
					accept=".osz"
					class="hidden"
					bind:this={fileInput}
					on:change={handleFileSelect}
				/>

				<div
					class="border-2 border-dashed border-white/30 rounded-lg p-8 text-center transition-colors cursor-pointer {isDragging
						? 'border-yellow-200 bg-yellow-500/20'
						: 'hover:border-yellow-200'}"
					on:dragover={handleDragOver}
					on:dragleave={handleDragLeave}
					on:drop={handleDrop}
					on:click={triggerFileInput}
				>
					{#if !importedFile}
						<p class="text-white/80">
							Drag and drop your .osz file here<br />
							or click to select a file
						</p>
					{:else}
						<p class="text-white/80">
							File loaded: {importedFile.name}<br />
							{#if isConverting}
								<p class="text-yellow-200 mt-2">{conversionProgress}</p>
							{:else if convertedData}
								<button
									class="mt-4 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded transition-colors"
									on:click|stopPropagation={downloadConvertedFile}
								>
									Download Converted File
								</button>
							{/if}
						</p>
					{/if}
				</div>

				{#if errorMessage}
					<p class="text-red-200 mt-2 text-sm">{errorMessage}</p>
				{/if}
			</div>
		</div>
	</div>
</div> 