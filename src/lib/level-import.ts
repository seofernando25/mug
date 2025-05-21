import JSZip from 'jszip';


export interface OsuDifficulty {
	overallDifficulty: number;
	approachRate: number;
	circleSize: number;
	hpDrain: number;
	sliderMultiplier: number;
	sliderTickRate: number;
}

export interface OsuHitObject {
	x: number;
	y: number;
	time: number;
	type: number;
	hitSound: number;
	objectParams?: string;
	hitSample?: string;
}

export interface OsuTimingPoint {
	time: number;
	beatLength: number;
	meter: number;
	sampleSet: number;
	sampleIndex: number;
	volume: number;
	uninherited: number;
	effects: number;
}

function parseOsuFileInternal(content: string) {
	const sections: { [key: string]: string[] } = {};
	let currentSection = '';

	content.split('\n').forEach((line) => {
		line = line.trim();
		if (line.startsWith('[') && line.endsWith(']')) {
			currentSection = line.slice(1, -1);
			sections[currentSection] = [];
		} else if (line && currentSection) {
			sections[currentSection].push(line);
		}
	});

	const metadata: { [key: string]: string } = {};
	sections['Metadata']?.forEach((line) => {
		const [key, value] = line.split(':').map((s) => s.trim());
		if (key && value) metadata[key] = value;
	});

	sections['General']?.forEach((line) => {
		const [key, value] = line.split(':').map((s) => s.trim());
		if (key && value && key === 'AudioFilename') {
			metadata['AudioFilename'] = value;
		}
	});

	const timingPoints: OsuTimingPoint[] = [];
	sections['TimingPoints']?.forEach((line) => {
		const [time, beatLength, meter, sampleSet, sampleIndex, volume, uninherited, effects] = line
			.split(',')
			.map(Number);
		timingPoints.push({ time, beatLength, meter, sampleSet, sampleIndex, volume, uninherited, effects });
	});

	const hitObjects: OsuHitObject[] = [];
	sections['HitObjects']?.forEach((line) => {
		const [x, y, time, type, hitSound, ...rest] = line.split(',');
		const obj: OsuHitObject = {
			x: Number(x), y: Number(y), time: Number(time), type: Number(type), hitSound: Number(hitSound)
		};
		if (rest.length > 0) obj.objectParams = rest.join(',');
		hitObjects.push(obj);
	});

	const difficulty: OsuDifficulty = {
		overallDifficulty: 0,
		approachRate: 0,
		circleSize: 0,
		hpDrain: 0,
		sliderMultiplier: 0,
		sliderTickRate: 0
	};



	sections['Difficulty']?.forEach((line) => {
		const [key, value] = line.split(':').map((s) => s.trim());
		if (key && value) {
			switch (key) {
				case 'HPDrainRate':
					difficulty.hpDrain = Number(value);
					break;
				case 'CircleSize':
					difficulty.circleSize = Number(value);
					break;
				case 'OverallDifficulty':
					difficulty.overallDifficulty = Number(value);
					break;
				case 'ApproachRate':
					difficulty.approachRate = Number(value);
					break;
				case 'SliderMultiplier':
					difficulty.sliderMultiplier = Number(value);
					break;
				case 'SliderTickRate':
					difficulty.sliderTickRate = Number(value);
					break;
				default:
					console.warn(`Unknown difficulty key: ${key}`);
					break;
			}
		}
	});

	return { metadata, timingPoints, hitObjects, difficulty };
}

function convertToMugFormatInternal(osuData: ReturnType<typeof parseOsuFileInternal>) {
	const bpm = osuData.timingPoints[0] ? Math.round(60000 / osuData.timingPoints[0].beatLength) : 120;
	const hitObjects = osuData.hitObjects.map((obj) => {
		const lane = Math.min(3, Math.max(0, Math.floor((obj.x / 512) * 4)));
		const isHold = (obj.type & 128) !== 0;
		if (isHold && obj.objectParams) {
			const [endTime] = obj.objectParams.split(',').map(Number);
			return { time: obj.time, lane, type: 'hold', duration: endTime - obj.time };
		}
		return { time: obj.time, lane, type: 'tap' };
	});

	return {
		metadata: {
			title: osuData.metadata['Title'] || 'Unknown Title',
			artist: osuData.metadata['Artist'] || 'Unknown Artist',
			audioFilename: osuData.metadata['AudioFilename'] || 'audio.mp3',
			bpm,
			previewStartTime: 0
		},
		charts: [{
			difficultyName: osuData.metadata['Version'] || 'Normal',
			lanes: 4,
			noteScrollSpeed: osuData.difficulty.approachRate,
			lyrics: [],
			hitObjects,
			mockLeaderboard: [
				{ name: 'DJMax', score: 150000 },
				{ name: 'RhythmFan', score: 140000 },
				{ name: 'OSUConvert', score: 120000 }
			]
		}]
	};
}

async function processOszFile(file: File, onProgress?: (msg: string) => void): Promise<{ success: boolean; message: string; mugData?: any; audioContent?: Uint8Array; audioFilename?: string; songDir?: string; }> {
	try {
		onProgress?.('Loading .osz file...');
		const oszZip = await JSZip.loadAsync(file);
		const osuFiles = Object.entries(oszZip.files).filter(([name]) => name.endsWith('.osu'));
		if (osuFiles.length === 0) return { success: false, message: 'No .osu files found in the .osz file' };

		onProgress?.('Parsing .osu files...');
		let audioFilename: string | null = null;
		const chartPromises = osuFiles.map(async ([fileName, osuFile]) => {
			const content = await osuFile.async('text');
			const parsed = parseOsuFileInternal(content);
			if (parsed.metadata['AudioFilename'] && !audioFilename) {
				audioFilename = parsed.metadata['AudioFilename'];
			}
			return parsed;
		});
		const allParsedData = await Promise.all(chartPromises);

		if (!audioFilename) return { success: false, message: 'Could not find AudioFilename in any .osu file.' };

		const firstChartWithMetadata = allParsedData.find(p => p.metadata['Title'] && p.metadata['Artist']);
		if (!firstChartWithMetadata) return { success: false, message: 'Could not extract base song metadata (Title, Artist).' };

		const songOverallMetadata = convertToMugFormatInternal(firstChartWithMetadata).metadata;

		const charts = allParsedData.map(parsedData => convertToMugFormatInternal(parsedData).charts[0]);

		const audioFileEntry = Object.entries(oszZip.files).find(
			([name]) => name === audioFilename || name.endsWith('/' + audioFilename)
		);
		if (!audioFileEntry) return { success: false, message: `Audio file "${audioFilename}" not found.` };

		const audioContent = await audioFileEntry[1].async('uint8array');
		const songDir = songOverallMetadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

		const mugData = {
			metadata: songOverallMetadata,
			charts: charts
		};

		return { success: true, message: 'OSZ processed successfully', mugData, audioContent, audioFilename, songDir };
	} catch (error: any) {
		console.error('Error processing .osz file:', error);
		return { success: false, message: 'Error processing .osz file: ' + error.message };
	}
}

async function processMugFile(file: File, onProgress?: (msg: string) => void): Promise<{ success: boolean; message: string; songData?: any; audioContent?: Uint8Array; audioFilename?: string; songDir?: string; }> {
	try {
		onProgress?.('Loading .mug file...');
		const mugZip = await JSZip.loadAsync(file);
		const songJsonFile = mugZip.file('song.json');
		if (!songJsonFile) return { success: false, message: 'song.json not found in .mug file' };

		const songJsonContent = await songJsonFile.async('text');
		const songData = JSON.parse(songJsonContent);
		const audioFilename = songData.metadata.audioFilename;
		if (!audioFilename) return { success: false, message: 'audioFilename not found in song.json metadata' };

		const audioFile = mugZip.file(audioFilename);
		if (!audioFile) return { success: false, message: `Audio file "${audioFilename}" not found in .mug file` };

		const audioContent = await audioFile.async('uint8array');
		const songDir = songData.metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

		return { success: true, message: 'MUG processed successfully', songData, audioContent, audioFilename, songDir };
	} catch (error: any) {
		console.error('Error processing .mug file:', error);
		return { success: false, message: 'Error processing .mug file: ' + error.message };
	}
}

async function _installSongOnServer(
	songDataJSON: any,
	audioContent: Uint8Array,
	audioFilename: string,
	songDir: string,
	onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string; title?: string }> {
	onProgress?.('Preparing to install song...');
	const formData = new FormData();
	formData.append('songData', new Blob([JSON.stringify(songDataJSON)], { type: 'application/json' }));

	let audioType = 'application/octet-stream';
	if (audioFilename.endsWith('.mp3')) audioType = 'audio/mpeg';
	else if (audioFilename.endsWith('.wav')) audioType = 'audio/wav';
	else if (audioFilename.endsWith('.ogg')) audioType = 'audio/ogg';

	formData.append('audioFile', new Blob([audioContent], { type: audioType }), audioFilename);
	formData.append('songDir', songDir);

	try {
		onProgress?.(`Installing song: ${songDataJSON.metadata.title}...`);
		const response = await fetch('/api/install-song', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text();
			return { success: false, message: `Failed to install song: ${errorText || response.statusText}` };
		}
		onProgress?.('Song installed successfully!');
		return { success: true, message: `Song "${songDataJSON.metadata.title}" installed successfully!`, title: songDataJSON.metadata.title };
	} catch (error: any) {
		console.error('Error installing song via API:', error);
		return { success: false, message: 'Network error or server issue during installation: ' + error.message };
	}
}

export async function convertOszAndInstall(
	file: File,
	onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string; title?: string }> {
	const processResult = await processOszFile(file, onProgress);
	if (!processResult.success) return processResult;

	if (!processResult.mugData || !processResult.audioContent || !processResult.audioFilename || !processResult.songDir) {
		return { success: false, message: "Internal error: Missing data after OSZ processing." };
	}

	return await _installSongOnServer(
		processResult.mugData,
		processResult.audioContent,
		processResult.audioFilename,
		processResult.songDir,
		onProgress
	);
}

export async function importMugAndInstall(
	file: File,
	onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string; title?: string }> {
	const processResult = await processMugFile(file, onProgress);
	if (!processResult.success) return processResult;

	if (!processResult.songData || !processResult.audioContent || !processResult.audioFilename || !processResult.songDir) {
		return { success: false, message: "Internal error: Missing data after MUG processing." };
	}

	return await _installSongOnServer(
		processResult.songData,
		processResult.audioContent,
		processResult.audioFilename,
		processResult.songDir,
		onProgress
	);
} 