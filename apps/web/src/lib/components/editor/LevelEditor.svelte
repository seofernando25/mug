<script lang="ts">
import { onMount } from 'svelte';
import type { GameRenderer, AudioClock } from '@mug/engine';
import type { EditorState } from '$lib/stores/EditorState.svelte';
import type { Sound } from '@pixi/sound';

// Props for the component
interface Props {
    editorState: EditorState;
    audioUrl: string;
}

const { editorState, audioUrl }: Props = $props();

let canvasElement: HTMLCanvasElement;
let gameRenderer: GameRenderer;
let audioClock: AudioClock;
let animationFrameId: number;
let pixiSoundInstance: Sound;
let resizeObserver: ResizeObserver; // Declare at top-level

// --- Input Handling ---
const handleWheel = (e: WheelEvent) => { // Declare at top-level
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
        const { GameRenderer, AudioClock } = await import('@mug/engine');
        const { Sound } = await import('@pixi/sound');

        // Load audio using PixiSound
        pixiSoundInstance = Sound.from({
            url: audioUrl,
            preload: true,
            autoPlay: false,
            loop: false,
            loaded: () => { // Use the loaded callback directly in options
                audioClock = new AudioClock(pixiSoundInstance);
                
                // GameRenderer initialization
                gameRenderer = new GameRenderer({
                    canvas: canvasElement,
                    lanes: editorState.chart.lanes,
                });

                gameRenderer.init().then(() => {
                    gameRenderer.setEditorMode(true);
                });

                // Handle canvas resizing
                resizeObserver = new ResizeObserver(() => { // Assign here
                    gameRenderer.handleResize();
                });
                resizeObserver.observe(canvasElement);

                // --- Render Loop ---
                const animate = () => {
                    // In editor mode, we render based on editorState.scrollTime
                    // The game state for notes would come from editorState.chart.hitObjects
                    // We need to transform ChartHitObject into EngineNote for the renderer
                    const editorGameState = {
                        score: 0, combo: 0, maxCombo: 0,
                        notes: editorState.chart.hitObjects.map(ho => ({
                            ...ho,
                            id: ho.id as number, // Cast Drizzle's serial id to number if needed
                            isHit: false, isMissed: false, isHolding: false, holdSatisfied: false, holdBroken: false
                        }))
                    };
                    gameRenderer.render(editorGameState, editorState.scrollTime);
                    animationFrameId = requestAnimationFrame(animate);
                };
                
                animate();

                canvasElement.addEventListener('wheel', handleWheel, { passive: false });
            }
        });
    })();

    return () => {
        if (cleanupCalled) return;
        cleanupCalled = true;

        cancelAnimationFrame(animationFrameId);
        // Only disconnect if resizeObserver was successfully observed
        if (canvasElement && resizeObserver) {
            resizeObserver.disconnect();
        }
        if (canvasElement) {
            canvasElement.removeEventListener('wheel', handleWheel);
        }
        gameRenderer?.destroy();
        audioClock?.stop(); // Stop any playback
        pixiSoundInstance?.destroy(); // Release PixiSound resources
    };
});
</script>

<div class="editor-container">
    <canvas bind:this={canvasElement}></canvas>
</div>

<style>
.editor-container {
    width: 100%;
    height: 100%;
    overflow: hidden; /* Prevent scrollbars from appearing */
    position: relative;
    background-color: #333; /* Dark background for editor */
}
canvas {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
