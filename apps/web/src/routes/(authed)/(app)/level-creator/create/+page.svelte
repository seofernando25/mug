<script lang="ts">
import { onMount } from "svelte";
// import type { ClientSong as SongData, ClientChart as ChartData } from "$lib/types"; // No longer needed directly here
// import * as PIXI from "pixi.js"; // No longer needed

import { EditorState } from "$lib/stores/EditorState.svelte";
import LevelEditor from "$lib/components/editor/LevelEditor.svelte";

// --- STATE ---
let musicFile: File | null = $state(null);
let musicErrorMessage = $state<string | null>(null);
let musicFileInput: HTMLInputElement | null = $state(null);
let isMusicDragging = $state(false);
let musicFileReady = $state(false);
let audioUrl: string | null = $state(null);

let editorState = $state<EditorState | null>(null); // New: EditorState instance

// --- HANDLERS ---
function handleMusicDragOver(e: DragEvent) { e.preventDefault(); e.stopPropagation(); isMusicDragging = true; }
function handleMusicDragLeave(e: DragEvent) { e.preventDefault(); e.stopPropagation(); isMusicDragging = false; }

function handleMusicDrop(e: DragEvent) {
    e.preventDefault(); e.stopPropagation(); isMusicDragging = false; musicErrorMessage = null;
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("audio/")) { musicErrorMessage = "Please drop a valid audio file"; return; }
    musicFile = file;
    prepareMusicFile(file);
}

function handleMusicFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file.type.startsWith("audio/")) { musicErrorMessage = "Please select a valid audio file"; return; }
    musicFile = file;
    prepareMusicFile(file);
}

function triggerMusicFileInput() { musicFileInput?.click(); }

function prepareMusicFile(file: File) {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(file);
    musicFileReady = true;

    // Initialize editorState
    editorState = new EditorState();
    // Potentially load initial chart data into editorState if editing an existing chart
    // For now, it will start with a default empty chart
}

onMount(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
});
</script>

<svelte:head>
    <title>Editor - MUG</title>
</svelte:head>

<div class="flex flex-col h-[calc(100vh-4rem)] bg-gray-950 text-gray-100 overflow-hidden">
    <div class="h-16 bg-gray-900 border-b border-white/10 flex items-center px-6 justify-between shrink-0 z-20">
        <h1 class="text-lg font-bold text-white flex items-center gap-2">
            <span class="text-purple-400">MUG</span> Editor
        </h1>
        {#if musicFileReady}
             <div class="flex items-center gap-4">
                 <span class="text-sm font-mono text-gray-400">{musicFile?.name || 'Untitled'}</span>
             </div>
        {/if}
    </div>

    <div class="flex-1 flex overflow-hidden relative">
        {#if !musicFileReady}
            <div class="absolute inset-0 flex items-center justify-center z-10 p-8">
                <div 
                    class="w-full max-w-lg p-12 rounded-3xl border-2 border-dashed border-white/10 bg-gray-900/50 flex flex-col items-center text-center transition-all duration-300
                    {isMusicDragging ? 'border-purple-500 bg-purple-500/10 scale-105' : 'hover:border-purple-500/30 hover:bg-gray-800/80'}"
                    role="button"
                    tabindex="0"
                    ondragover={handleMusicDragOver}
                    ondragleave={handleMusicDragLeave}
                    ondrop={handleMusicDrop}
                    onclick={triggerMusicFileInput}
                    onkeydown={(e) => e.key === 'Enter' && triggerMusicFileInput()}
                >
                    <div class="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-white/5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 text-purple-400">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l3-3m0 0l3 3m-3-3v12a11.25 11.25 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-white mb-2">Upload Audio</h2>
                    <p class="text-gray-400 mb-8">Drag & drop an MP3/OGG file to start mapping.</p>
                    
                    <input type="file" accept="audio/*" class="hidden" bind:this={musicFileInput} onchange={handleMusicFileSelect} />
                    
                    <button class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg shadow-purple-900/20">
                        Select File
                    </button>
                    
                    {#if musicErrorMessage}
                        <p class="text-red-400 mt-6 text-sm bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/20">{musicErrorMessage}</p>
                    {/if}
                </div>
            </div>
        {:else}
            <div class="flex-1 flex flex-col relative bg-gray-950">
                 <div class="flex-grow relative flex justify-center bg-black/20">
                      {#if musicFileReady && audioUrl && editorState}
                          <LevelEditor {editorState} audioUrl={audioUrl} />
                      {/if}
                 </div>
                 
                 <div class="h-20 bg-gray-900 border-t border-white/10 shrink-0 flex items-center px-6 gap-4 z-20">
                      <audio src={audioUrl} controls class="w-full h-10 opacity-70 hover:opacity-100 transition-opacity invert hue-rotate-180"></audio>
                 </div>
            </div>
        {/if}
    </div>
</div>
