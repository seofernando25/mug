<script lang="ts">
import { orpcClient } from "$lib/rpc/client";

let isDragging = $state(false);
let importedFile: File | null = $state(null);
let errorMessage = $state<string | null>(null);
let fileInput: HTMLInputElement;
let isConverting = $state(false);
let conversionProgress = $state<string>("");

function handleDragOver(e: DragEvent) { e.preventDefault(); e.stopPropagation(); isDragging = true; }
function handleDragLeave(e: DragEvent) { e.preventDefault(); e.stopPropagation(); isDragging = false; }

async function uploadAndProcessFile(file: File, onProgress?: (msg: string) => void) {
    onProgress?.(`Uploading ${file.name}...`);
    try {
        const response = await orpcClient.song.install({ file: file });
        if (!response.success) return { success: false, message: response.message };
        onProgress?.(response.message || "Success!");
        return response;
    } catch (error: unknown) {
        console.error("Import failed:", error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : "Import failed" 
        };
    }
}

async function handleFile(file: File) {
    importedFile = file;
    isConverting = true;
    errorMessage = null;
    conversionProgress = "";
    
    if (!file.name.endsWith(".osz") && !file.name.endsWith(".mug")) {
        errorMessage = "Invalid file type. Please use .osz or .mug";
        isConverting = false;
        importedFile = null;
        return;
    }

    const result = await uploadAndProcessFile(file, (msg) => (conversionProgress = msg));
    if (!result.success) {
        errorMessage = result.message || "An unknown error occurred";
    } else {
        conversionProgress = "Done!";
    }
    isConverting = false;
}

function handleDrop(e: DragEvent) {
    e.preventDefault(); e.stopPropagation(); isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) handleFile(files[0]);
}

function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) handleFile(input.files[0]);
    input.value = "";
}

function triggerFileInput() { fileInput?.click(); }
</script>

<div class="group relative flex flex-col justify-between h-64 p-8 rounded-2xl bg-gray-900/60 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-gray-800/80 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden">
    <div class="absolute top-0 right-0 p-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-600/20"></div>

    <div class="relative z-10 pointer-events-none">
        <div class="w-14 h-14 mb-6 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-300 group-hover:text-white group-hover:bg-blue-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
                <path d="M9.97.97a.75.75 0 011.06 0l3 3a.75.75 0 01-1.06 1.06l-1.72-1.72v3.44h-1.5V3.31L8.03 5.03a.75.75 0 01-1.06-1.06l3-3zM9.75 6.75v6a.75.75 0 001.5 0v-6h3a3 3 0 013 3v7.5a3 3 0 01-3 3h-7.5a3 3 0 01-3-3v-7.5a3 3 0 013-3h3z" />
                <path d="M7.151 21.75a2.999 2.999 0 002.599 1.5h7.5a3 3 0 003-3v-7.5c0-1.11-.603-2.08-1.5-2.599v7.099a4.5 4.5 0 01-4.5 4.5H7.151z" />
            </svg>
        </div>
        <h2 class="text-3xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
            Import Level
        </h2>
    </div>

    <div class="relative z-10 grow flex flex-col justify-end">
        <input type="file" accept=".osz,.mug" class="hidden" bind:this={fileInput} onchange={handleFileSelect} />

        <button
            class="w-full border-2 border-dashed border-white/20 rounded-xl p-4 text-center transition-all duration-200 
            {isDragging ? 'border-blue-400 bg-blue-500/20' : 'hover:border-blue-400/50 hover:bg-white/5'}
            flex flex-col items-center justify-center gap-2 h-24"
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            ondrop={handleDrop}
            onclick={triggerFileInput}
        >
            {#if !importedFile}
                <span class="text-sm text-gray-400 group-hover:text-gray-300">
                    Drop <span class="text-blue-400 font-mono">.osz</span> or <span class="text-blue-400 font-mono">.mug</span>
                </span>
            {:else}
                <span class="text-sm text-white font-semibold truncate max-w-full px-2">
                    {importedFile.name}
                </span>
                {#if isConverting}
                    <span class="text-xs text-blue-300 animate-pulse">{conversionProgress || 'Processing...'}</span>
                {:else if errorMessage}
                     <span class="text-xs text-red-400">{errorMessage}</span>
                {:else}
                     <span class="text-xs text-green-400">Ready!</span>
                {/if}
            {/if}
        </button>
    </div>
</div>
