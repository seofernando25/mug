import JSZip from 'jszip';

export interface ParsedOsuData {
	metadata: Record<string, string>;
	timingPoints: { time: number; beatLength: number; meter: number; sampleSet: number; sampleIndex: number; volume: number; uninherited: number; effects: number; }[];
	hitObjects: { x: number; y: number; time: number; type: number; hitSound: number; objectParams?: string; hitSample?: string; }[];
	sections: Record<string, string[]>; // Include sections for event parsing
}

export interface ConvertedHitObject {
	time: number;
	lane: number; // 0-indexed
	type: 'tap' | 'hold';
	duration?: number | null; // ms, for hold notes
}

export interface ConvertedChartData {
	difficultyName: string;
	lanes: number;
	noteScrollSpeed: number;
	lyrics?: { time: number; text: string; }[] | null; // Optional lyrics per chart (based on osu!)
}

// Structure returned by the processor
export interface ProcessedSongData {
	metadata: {
		title: string;
		artist: string;
		audioFilename: string;
		bpm: number;
		previewStartTime: number; // ms
		imageFilename?: string | null; // Original image filename if found
	};
	charts: ConvertedChartData[];
	// hitObjects are returned as an array of arrays, corresponding to the charts
	hitObjects: ConvertedHitObject[][];
	audioContent: Uint8Array;
	imageContent?: Uint8Array | null; // Image content if found
}


// Helper to parse a single .osu file content
function parseOsuFileContent(content: string): ParsedOsuData {
	const sections: Record<string, string[]> = {};
	let currentSection = '';

	content.split('\n').forEach((line) => {
		line = line.trim();
		if (line.startsWith('[') && line.endsWith(']')) {
			currentSection = line.slice(1, -1);
			sections[currentSection] = [];
		} else if (line && currentSection) {
			sections[currentSection]?.push(line);
		}
	});

	const metadata: Record<string, string> = {};
	sections['Metadata']?.forEach((line) => {
		const [key, value] = line.split(':').map((s) => s.trim());
		if (key && value) metadata[key] = value;
	});

	sections['General']?.forEach((line) => {
		const [key, value] = line.split(':').map((s) => s.trim());
		if (key && value && key === 'AudioFilename') {
			metadata['AudioFilename'] = value;
		}
		// Also get PreviewTime from General section
		if (key && value && key === 'PreviewTime') {
			metadata['PreviewTime'] = value;
		}
	});

	const timingPoints: ParsedOsuData['timingPoints'] = [];
	sections['TimingPoints']?.forEach((line) => {
		const [time, beatLength, meter, sampleSet, sampleIndex, volume, uninherited, effects] = line
			.split(',')
			.map(Number);
		if (!time || !beatLength || !meter || !sampleSet || !sampleIndex || !volume || !uninherited || !effects) {
			console.warn(`Invalid timing point: ${line}`);
			return;
		}
		timingPoints.push({ time, beatLength, meter, sampleSet, sampleIndex, volume, uninherited, effects });
	});

	const hitObjects: ParsedOsuData['hitObjects'] = [];
	sections['HitObjects']?.forEach((line) => {
		const [x, y, time, type, hitSound, ...rest] = line.split(',');
		const obj: ParsedOsuData['hitObjects'][number] = {
			x: Number(x), y: Number(y), time: Number(time), type: Number(type), hitSound: Number(hitSound)
		};
		if (rest.length > 0) obj.objectParams = rest.join(',');
		hitObjects.push(obj);
	});

	return { metadata, timingPoints, hitObjects, sections }; // Return sections too
}

// Helper to convert parsed osu data to your chart format and hit objects
function convertOsuDataToChart(osuData: ParsedOsuData): { chartData: ConvertedChartData; hitObjects: ConvertedHitObject[] } {
	const bpm = osuData.timingPoints.find(tp => tp.uninherited !== 0)?.beatLength; // Find first non-inherited timing point's beatLength
	const calculatedBpm = bpm ? Math.round(60000 / bpm) : 120; // Calculate BPM, default to 120 if no timing points found

	const hitObjects: ConvertedHitObject[] = osuData.hitObjects.map((obj) => {
		const lane = Math.min(3, Math.max(0, Math.floor((obj.x / 512) * 4))); // Basic 4-lane mapping for mania mode
		const isHold = (obj.type & 128) !== 0;
		let duration: number | null = null; // Use number | null for duration
		let finalType: 'tap' | 'hold' = isHold ? 'hold' : 'tap';

		if (isHold && obj.objectParams) {
			const params = obj.objectParams.split(':'); // Mania hold format is endTime:hitSample
			const endTimeString = params[0];
			const endTime = Number(endTimeString);

			if (!isNaN(endTime) && endTime > obj.time) {
				duration = endTime - obj.time;
			} else {
				// If endTime is invalid or not greater than startTime, treat as a tap note.
				console.warn(`Invalid hold note params for object at time ${obj.time}: objectParams='${obj.objectParams}'. Falling back to tap.`);
				finalType = 'tap';
				duration = null;
			}
		} else if (isHold && !obj.objectParams) {
			// If it's supposed to be a hold note but has no objectParams, it's malformed. Treat as tap.
			console.warn(`Hold note missing objectParams at time ${obj.time}. Falling back to tap.`);
			finalType = 'tap';
			duration = null;
		}

		return {
			time: obj.time,
			lane,
			type: finalType,
			duration: duration
		};
	});


	return {
		chartData: {
			difficultyName: osuData.metadata['Version'] || 'Normal',
			lanes: 4, // Fixed lanes for now as per discussion
			noteScrollSpeed: osuData.metadata['ApproachRate'] ? Number(osuData.metadata['ApproachRate']) : 1.0, // Use AR if available, default to 1.0
			lyrics: null, // Assign lyrics if parsed
		},
		hitObjects: hitObjects
	};
}


// Main function to process the uploaded file Blob
export async function processFileAndExtractData(fileBlob: Blob): Promise<ProcessedSongData> {
	// Check if fileBlob is a File instance and has a name, otherwise provide a default.
	const filename = (fileBlob instanceof File && fileBlob.name) ? fileBlob.name : 'uploaded_file';
	const fileExtension = filename.split('.').pop()?.toLowerCase();

	if (fileExtension !== 'osz' && fileExtension !== 'mug') {
		throw new Error('Invalid file type. Only .osz and .mug files are accepted.');
	}

	let mugData: any; // Intermediate structure
	let audioContent: Uint8Array | null = null;
	let audioFilename: string | null = null;
	let imageContent: Uint8Array | null = null;
	let imageFilename: string | null = null;


	const fileBuffer = await fileBlob.arrayBuffer();
	const jszip = await JSZip.loadAsync(fileBuffer);

	if (fileExtension === 'osz') {
		const osuFiles = Object.entries(jszip.files).filter(([name]) => name.endsWith('.osu') && !name.startsWith('__MACOSX'));
		if (osuFiles.length === 0) throw new Error('No .osu files found in the .osz file.');

		const allParsedOsuData = await Promise.all(osuFiles.map(async ([fileName, osuFile]) => {
			const content = await osuFile.async('text');
			return parseOsuFileContent(content);
		}));

		const foundAudioFilename = allParsedOsuData.find(p => p.metadata?.['AudioFilename'])?.metadata?.['AudioFilename'];
		if (!foundAudioFilename) throw new Error('Could not find AudioFilename in .osu files.');
		audioFilename = foundAudioFilename;

		const primaryOsuData = allParsedOsuData.find(p => p.metadata?.['Title'] && p.metadata?.['Artist']);
		if (!primaryOsuData) throw new Error('Could not extract base song metadata (Title, Artist) from .osu files.');

		const initialTimingPoint = primaryOsuData.timingPoints.find((tp: any) => tp.uninherited !== 0);
		const bpm = initialTimingPoint ? Math.round(60000 / initialTimingPoint.beatLength) : 120;

		const convertedChartsWithHitObjects = allParsedOsuData.map(osuData => convertOsuDataToChart(osuData));

		// Find audio file in the zip
		const audioFileEntry = Object.entries(jszip.files).find(
			([name]) => name === audioFilename || name.endsWith('/' + audioFilename) // Handle potential subdirectories
		);
		if (!audioFileEntry) throw new Error(`Audio file "${audioFilename}" not found in .osz.`);
		audioContent = await audioFileEntry[1].async('uint8array');

		// Find background image using the Events section from *any* .osu file (ideally the primary one)
		const osuDataWithEvents = allParsedOsuData.find(p => p.sections['Events'] && p.sections['Events'].length > 0);
		if (osuDataWithEvents) {
			const eventSection = osuDataWithEvents.sections['Events'];
			const bgEvent = eventSection?.find(line => line.startsWith('0,0,')); // Find the background event
			if (bgEvent) {
				const parts = bgEvent.split(',');
				if (parts.length > 2) {
					const bgFilename = parts[2]?.replace(/"/g, ''); // Filename is usually in quotes
					const imageFileEntry = Object.entries(jszip.files).find(
						([name]) => name === bgFilename || name.endsWith('/' + bgFilename)
					);
					if (imageFileEntry) {
						imageFilename = imageFileEntry[0]; // Use the full name from zip entry
						imageContent = await imageFileEntry[1].async('uint8array');
					}
				}
			}
		}


		// Construct the final ProcessedSongData structure
		const previewTime = primaryOsuData.metadata['PreviewTime'] ? Number(primaryOsuData.metadata['PreviewTime']) : 0;

		mugData = {
			metadata: {
				title: primaryOsuData.metadata['Title'] || 'Unknown Title',
				artist: primaryOsuData.metadata['Artist'] || 'Unknown Artist',
				audioFilename: audioFilename,
				imageFilename: imageFilename, // Include imageFilename in the metadata for the API to use
				bpm: bpm,
				previewStartTime: previewTime,
			},
			charts: convertedChartsWithHitObjects.map(cd => cd.chartData),
			hitObjects: convertedChartsWithHitObjects.map(cd => cd.hitObjects), // Array of arrays
			audioContent: audioContent,
			imageContent: imageContent,
		};


	} else if (fileExtension === 'mug') {
		// Process .mug file (expected to be a zip containing song.json, audio, and potentially image)
		const songJsonFile = jszip.file('song.json');
		if (!songJsonFile) throw new Error('song.json not found in .mug file.');

		const songJsonContent = await songJsonFile.async('text');
		const mugFileData = JSON.parse(songJsonContent); // Data from the mug's song.json

		// Validate minimal mug structure for required fields
		if (!mugFileData.metadata?.title || !mugFileData.metadata?.artist || !mugFileData.metadata?.audioFilename || !mugFileData.metadata?.bpm) {
			throw new Error('Invalid .mug song.json structure: Missing metadata.');
		}
		if (!Array.isArray(mugFileData.charts) || mugFileData.charts.length === 0) {
			throw new Error('Invalid .mug song.json structure: Missing or empty charts array.');
		}
		// Validate hitObjects structure - it should be an array of arrays corresponding to charts
		// This assumes the .mug format stores hitObjects this way after server-side processing
		if (!Array.isArray(mugFileData.hitObjects) || mugFileData.hitObjects.length !== mugFileData.charts.length || !mugFileData.hitObjects.every(Array.isArray)) {
			throw new Error('Invalid .mug song.json structure: Invalid hitObjects array.');
		}


		audioFilename = mugFileData.metadata.audioFilename;
		const audioFileEntry = Object.entries(jszip.files).find(
			([name]) => name === audioFilename || name.endsWith('/' + audioFilename)
		);
		if (!audioFileEntry) throw new Error(`Audio file "${audioFilename}" not found in .mug.`);
		audioContent = await audioFileEntry[1].async('uint8array');

		// Check for image in MUG format (optional)
		imageFilename = mugFileData.metadata.imageFilename; // Assuming MUG metadata might store imageFilename
		if (imageFilename) {
			const imageFileEntry = Object.entries(jszip.files).find(
				([name]) => name === imageFilename || name.endsWith('/' + imageFilename)
			);
			if (imageFileEntry) {
				imageContent = await imageFileEntry[1].async('uint8array');
			} else {
				console.warn(`Image file "${imageFilename}" specified in song.json not found in .mug.`);
			}
		}


		// Construct the final ProcessedSongData structure from mug file data
		mugData = {
			metadata: {
				title: mugFileData.metadata.title,
				artist: mugFileData.metadata.artist,
				audioFilename: audioFilename,
				imageFilename: imageFilename, // Keep the image filename from metadata
				bpm: mugFileData.metadata.bpm,
				previewStartTime: mugFileData.metadata.previewStartTime ?? 0,
			},
			charts: mugFileData.charts,
			hitObjects: mugFileData.hitObjects, // Already in array of arrays format
			audioContent: audioContent,
			imageContent: imageContent, // Content if found
		};
	} else {
		// This case should already be caught by the initial file extension check, but good safety
		throw new Error('Unsupported file extension.');
	}

	// Final validation of the processed structure before returning
	if (!mugData || !mugData.metadata || !mugData.charts || !Array.isArray(mugData.charts) || mugData.charts.length === 0 || !mugData.hitObjects || !Array.isArray(mugData.hitObjects) || mugData.hitObjects.length !== mugData.charts.length || !audioContent || !mugData.metadata.audioFilename) {
		throw new Error('Failed to process file into a valid and complete song data structure.');
	}


	return mugData as ProcessedSongData; // Cast to the defined interface
}