<script lang="ts">
	import { onMount } from 'svelte';
	import type { GameRenderer, AudioClock, WebAudioInstance } from '@mug/engine';
	import type { EditorState } from '$lib/stores/EditorState.svelte';

	// Props for the component
	interface Props {
		editorState: EditorState;
		audioUrl: string;
	}

	const { editorState, audioUrl }: Props = $props();

	let containerElement: HTMLDivElement;
	let gameRenderer: GameRenderer;
	let audioClock: AudioClock;
	let animationFrameId: number;
	let audioInstance: WebAudioInstance;
	let resizeObserver: ResizeObserver; // Declare at top-level

	// --- Input Handling ---
	const handleWheel = (e: WheelEvent) => {
		// Declare at top-level
		e.preventDefault(); // Prevent page scrolling
		if (e.ctrlKey) {
			// Ctrl + scroll for zooming
			editorState.zoomBy(-e.deltaY / 2); // Adjust multiplier for feel
		} else {
			// Scroll for timeline scrolling
			editorState.scrollBy(e.deltaY * 5); // Adjust multiplier for feel
		}
	};

	// --- Reactivity ---
	// Update renderer viewport when editorState's scrollTime or zoom changes
	$effect(() => {
		if (gameRenderer) {
			gameRenderer.setEditorViewport(editorState.scrollTime, editorState.zoom);
		}
	});

	onMount(() => {
		let cleanupCalled = false;

		// Dynamically import the engine ONLY on the client
		(async () => {
			const { GameRenderer, AudioClock, WebAudioInstance } = await import('@mug/engine');

			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			
			try {
				audioInstance = await WebAudioInstance.fromUrl(audioContext, audioUrl);
				
				audioClock = new AudioClock(audioInstance);

				// GameRenderer initialization
				gameRenderer = new GameRenderer({
					container: containerElement,
					lanes: editorState.chart.lanes
				});

				await gameRenderer.init();
				gameRenderer.setEditorMode(true);

				// Handle container resizing
				resizeObserver = new ResizeObserver(() => {
					// Assign here
					gameRenderer.handleResize();
				});
				resizeObserver.observe(containerElement);

				// --- Render Loop ---
				const animate = () => {
					// In editor mode, we render based on editorState.scrollTime
					// The game state for notes would come from editorState.chart.hitObjects
					// We need to transform ChartHitObject into EngineNote for the renderer
					const editorGameState = {
						score: 0,
						combo: 0,
						maxCombo: 0,
						notes: editorState.chart.hitObjects.map((ho) => ({
							...ho,
							id: ho.id as number, // Cast Drizzle's serial id to number if needed
							isHit: false,
							isMissed: false,
							isHolding: false,
							holdSatisfied: false,
							holdBroken: false
						}))
					};
					gameRenderer.render(editorGameState, editorState.scrollTime);
					animationFrameId = requestAnimationFrame(animate);
				};

				animate();

				containerElement.addEventListener('wheel', handleWheel, { passive: false });
			} catch (err) {
				console.error("Failed to initialize editor audio/renderer:", err);
			}
		})();

		return () => {
			if (cleanupCalled) return;
			cleanupCalled = true;

			cancelAnimationFrame(animationFrameId);
			// Only disconnect if resizeObserver was successfully observed
			if (containerElement && resizeObserver) {
				resizeObserver.disconnect();
			}
			if (containerElement) {
				containerElement.removeEventListener('wheel', handleWheel);
			}
			gameRenderer?.destroy();
			audioClock?.stop(); // Stop any playback
			audioInstance?.destroy();
		};
	});
</script>

<div class="editor-container" bind:this={containerElement}></div>

<style>
	.editor-container {
		width: 100%;
		height: 100%;
		overflow: hidden; /* Prevent scrollbars from appearing */
		position: relative;
		background-color: #333; /* Dark background for editor */
	}
</style>