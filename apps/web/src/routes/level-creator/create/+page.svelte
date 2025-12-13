<script lang="ts">
import { onMount } from "svelte";
import type {
	ClientSong as SongData,
	ClientChart as ChartData,
} from "$lib/types";
import * as PIXI from "pixi.js";

let musicFile: File | null = $state(null);
let musicErrorMessage = $state<string | null>(null);
let musicFileInput: HTMLInputElement | null = $state(null);
let isMusicDragging = $state(false);
let musicFileReady = $state(false);
let audioUrl: string | null = $state(null);

let levelEditorTrackDiv: HTMLDivElement | null = $state(null);
let levelEditorHeading: HTMLHeadingElement | null = $state(null);

let divWidth = $state(0);
let divHeight = $state(0);
let songData: SongData | null = $state(null);
let chartData: ChartData | null = $state(null);
let app: PIXI.Application | null = null;
let highwayGraphics: PIXI.Graphics | null = null;
let mainContainer: PIXI.Container | null = null;
let canvasElement: HTMLCanvasElement | null = null;
let resizeObserver: ResizeObserver | null = null;

function handleMusicDragOver(e: DragEvent) {
	e.preventDefault();
	e.stopPropagation();
	isMusicDragging = true;
}

function handleMusicDragLeave(e: DragEvent) {
	e.preventDefault();
	e.stopPropagation();
	isMusicDragging = false;
}

function handleMusicDrop(e: DragEvent) {
	e.preventDefault();
	e.stopPropagation();
	isMusicDragging = false;
	musicErrorMessage = null;

	const files = e.dataTransfer?.files;
	if (!files || files.length === 0) return;

	const file = files[0];
	if (!file.type.startsWith("audio/")) {
		musicErrorMessage = "Please drop a valid audio file";
		return;
	}

	musicFile = file;
	prepareMusicFile(file);
}

function handleMusicFileSelect(e: Event) {
	const input = e.target as HTMLInputElement;
	if (!input.files || input.files.length === 0) return;

	const file = input.files[0];
	if (!file.type.startsWith("audio/")) {
		musicErrorMessage = "Please select a valid audio file";
		return;
	}

	musicFile = file;
	prepareMusicFile(file);
}

function triggerMusicFileInput() {
	musicFileInput?.click();
}

function prepareMusicFile(file: File) {
	if (audioUrl) {
		URL.revokeObjectURL(audioUrl);
	}
	audioUrl = URL.createObjectURL(file);
	musicFileReady = true;

	const songId = `song-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
	songData = {
		id: songId,
		title: file.name,
		artist: "Unknown Artist",
		bpm: 120,
		audioUrl,
		imageUrl: undefined,
		audioFilename: file.name,
		audioS3Key: "",
		imageS3Key: null,
		uploaderId: "",
		uploadDate: new Date(),
		previewStartTime: 0,
		charts: [],
	} as typeof songData;

	chartData = {
		id: `chart-${Date.now()}`,
		songId,
		difficultyName: "Easy",
		lanes: 4,
		noteScrollSpeed: 1.0,
		hitObjects: [],
		lyrics: null,
	} as ChartData;
}

function drawHighwayLanes(
	app: PIXI.Application | null,
	mainContainer: PIXI.Container | null,
	highwayGraphics: PIXI.Graphics | null,
	chartData: ChartData | null,
	currentWidth: number,
	currentHeight: number,
) {
	if (!app || !mainContainer || !chartData) {
		return;
	}

	if (highwayGraphics) {
		mainContainer.removeChild(highwayGraphics);
		highwayGraphics.destroy();
	}

	highwayGraphics = new PIXI.Graphics();
	mainContainer.addChild(highwayGraphics);

	const numLanes = chartData.lanes || 4;
	const laneWidth = currentWidth / numLanes;

	for (let i = 0; i <= numLanes; i++) {
		const x = laneWidth * i;
		highwayGraphics.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.5 });
		highwayGraphics.moveTo(x, 0);
		highwayGraphics.lineTo(x, currentHeight);
	}

	highwayGraphics.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 1 });
	highwayGraphics.rect(0, 0, currentWidth, currentHeight);
	highwayGraphics.stroke();
}

$effect(() => {
	if (
		levelEditorTrackDiv &&
		musicFileReady &&
		songData &&
		chartData &&
		!resizeObserver
	) {
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				divWidth = entry.contentRect.width;
				divHeight =
					entry.contentRect.height -
					(levelEditorHeading?.offsetHeight || 0);
			}
		});

		resizeObserver.observe(levelEditorTrackDiv);
	}

	return () => {
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}
	};
});

$effect(() => {
	if (divWidth > 0 && divHeight > 0 && songData && chartData && !app) {
		const flexGrowDiv = levelEditorTrackDiv?.querySelector(".flex-grow");
		if (!flexGrowDiv) {
			return;
		}

		canvasElement = document.createElement("canvas");
		canvasElement.style.width = `${divWidth}px`;
		canvasElement.style.height = `${divHeight}px`;
		canvasElement.style.backgroundColor = "rgba(100, 149, 237, 0.5)";

		flexGrowDiv.appendChild(canvasElement);

		const pixiApp = new PIXI.Application();
		pixiApp
			.init({
				canvas: canvasElement,
				width: divWidth,
				height: divHeight,
				backgroundColor: 0x1a1a1a,
				backgroundAlpha: 1,
				antialias: true,
				resolution: window.devicePixelRatio || 1,
				autoDensity: true,
			})
			.then(() => {
				app = pixiApp;
				mainContainer = new PIXI.Container();
				app.stage.addChild(mainContainer);

				drawHighwayLanes(
					app,
					mainContainer,
					highwayGraphics,
					chartData,
					divWidth,
					divHeight,
				);
			})
			.catch((error) => {
				console.error("Error during PIXI initialization:", error);
				if (levelEditorTrackDiv) {
					levelEditorTrackDiv.innerHTML =
						'<p style="color: red;">Error setting up level editor visuals.</p>';
				}
			});
	} else if (app && divWidth > 0 && divHeight > 0) {
		app.renderer.resize(divWidth, divHeight);

		if (canvasElement) {
			canvasElement.style.width = `${divWidth}px`;
			canvasElement.style.height = `${divHeight}px`;
		}

		drawHighwayLanes(
			app,
			mainContainer,
			highwayGraphics,
			chartData,
			divWidth,
			divHeight,
		);
	} else if (
		app &&
		(divWidth <= 0 || divHeight <= 0 || !songData || !chartData)
	) {
		app.destroy(true, { children: true, texture: true });
		app = null;
	}

	return () => {
		if (app) {
			app.destroy(true, { children: true, texture: true });
			app = null;
		}
		if (canvasElement?.parentNode) {
			canvasElement.parentNode.removeChild(canvasElement);
			canvasElement = null;
		} else if (canvasElement) {
			canvasElement = null;
		}
		highwayGraphics = null;
		mainContainer = null;
	};
});

onMount(() => {
	return () => {
		if (audioUrl) {
			URL.revokeObjectURL(audioUrl);
		}
	};
});
</script>

<svelte:head>
	<title>Create New Level - MUG</title>
</svelte:head>

<div class="flex flex-col h-full pt-8 isolate">
	<div class="w-full max-w-4xl mx-auto px-4">
		<h1 class="text-4xl font-bold mb-10 text-gray-200 text-center">Create New Level</h1>

		<div class="grid grid-cols-1 gap-6">

			{#if !musicFileReady}
			<!-- Upload Music Section -->
			<div
				class="group block bg-linear-to-r from-green-500 to-teal-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out"
			>
				<h2 class="text-3xl font-bold text-white mb-1 group-hover:text-green-200 transition-colors flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 512 512"
						class="w-8 h-8 mr-3"
						fill="currentColor"
					>
						<path d="M464 256A208 208 0 1 0 256 464a208 208 0 1 0 0-416zm0 256A256 256 0 1 1 256 0a256 256 0 1 1 0 512zM256 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm96 96V352c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32 14.3 32 32zM192 192v128h96V192H192z"></path></svg>
					Upload Music
				</h2>
				<p class="text-md text-teal-100 mb-4">Upload an audio file for your custom level</p>

				<input
					type="file"
					accept="audio/*"
					class="hidden"
					bind:this={musicFileInput}
					onchange={handleMusicFileSelect}
				/>

				<div
					class="border-2 border-dashed border-white/30 rounded-lg p-8 text-center transition-colors cursor-pointer {isMusicDragging
						? 'border-green-200 bg-green-500/20'
						: 'hover:border-green-200'}"
					role="button"
					tabindex="0"
					ondragover={handleMusicDragOver}
					ondragleave={handleMusicDragLeave}
					ondrop={handleMusicDrop}
					onclick={triggerMusicFileInput}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							triggerMusicFileInput();
						}
					}}
				>
					{#if !musicFile}
						<p class="text-white/80">
							Drag and drop your music file here<br />
							or click to select a file
						</p>
					{:else}
						<p class="text-white/80">
							File loaded: {musicFile.name}
						</p>
					{/if}
				</div>

				{#if musicErrorMessage}
					<p class="text-red-200 mt-2 text-sm">{musicErrorMessage}</p>
				{/if}
			</div>
			{:else}
			<!-- Music Player Section -->
			<div
				class="group block bg-linear-to-r from-blue-500 to-purple-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out"
			>
				<h2 class="text-3xl font-bold text-white mb-4 flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-8 h-8 mr-3" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24v80c0 13.3 10.7 24 24 24h0c13.3 0 24-10.7 24-24V288h8c13.3 0 24-10.7 24-24V224c0-13.3-10.7-24-24-24h-96V160c0-13.3-10.7-24-24-24h0c-13.3 0-24 10.7-24 24v48h-8c-13.3 0-24 10.7-24 24v32c0 13.3 10.7 24 24 24zm80-80V192h32v64H296zm-80 0v-32h32v32h-32z"></path></svg>
					Now Playing: {musicFile?.name}
				</h2>
				{#if audioUrl}
					<audio controls src="{audioUrl}" class="w-full"></audio>
				{/if}
			</div>

			<!-- Level Editor Track Section Placeholder -->
			{#if musicFileReady}
			<div
				class="group block bg-linear-to-r from-orange-500 to-red-600 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out mt-6 h-170 overflow-y-auto flex flex-col"
				bind:this={levelEditorTrackDiv}
			>
				<h2 class="text-3xl font-bold text-white mb-4 flex items-center" bind:this={levelEditorHeading}>
					Level Editor Track (Coming Soon)
				</h2>
				{#if divWidth > 0 && divHeight > 0 && songData && chartData}
					<div class="grow"></div>
				{/if}
			</div>
			{/if}

			{/if}

		</div>
	</div>

</div> 