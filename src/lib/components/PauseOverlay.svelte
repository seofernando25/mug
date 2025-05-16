<script lang="ts">
    import { masterVolume, musicVolume, isPaused } from '$lib/stores/settingsStore';

    function resumeGame() {
        isPaused.set(false);
    }
</script>

{#if $isPaused}
    <div class="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 font-mono p-4" on:click|self={resumeGame} on:keydown|self={(e) => {if(e.key === 'Escape') resumeGame()}} tabindex="0" role="dialog" aria-modal="true">
        <div class="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6" on:click|stopPropagation>
            <h2 class="text-3xl font-bold text-purple-400 text-center">Paused</h2>
            
            <section class="space-y-4">
                <h3 class="text-xl font-semibold text-purple-300 border-b border-gray-700 pb-2">Audio Settings</h3>
                <div class="space-y-3">
                    <div>
                        <label for="pauseMasterVolume" class="block text-lg mb-1">Master Volume: {Math.round($masterVolume * 100)}%</label>
                        <input type="range" id="pauseMasterVolume" bind:value={$masterVolume} min="0" max="1" step="0.01" class="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                    </div>
                    <div>
                        <label for="pauseMusicVolume" class="block text-lg mb-1">Music Volume: {Math.round($musicVolume * 100)}%</label>
                        <input type="range" id="pauseMusicVolume" bind:value={$musicVolume} min="0" max="1" step="0.01" class="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                    </div>

                </div>
            </section>

            <button 
                on:click={resumeGame}
                class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50 transition-colors"
            >
                Resume
            </button>
        </div>
    </div>
{/if}

<style lang="postcss">
    /* Basic styling for range input track and thumb if not using a plugin: */
    /* (Copied from config page for consistency) */
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        background: #a855f7; /* purple-500 */
        cursor: pointer;
        border-radius: 50%;
        margin-top: -6px; /* Adjust to center thumb on track */
    }

    input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: #a855f7; /* purple-500 */
        cursor: pointer;
        border-radius: 50%;
        border: none;
    }
</style> </style> 
