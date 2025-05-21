<script lang="ts">
	import { orpcClient } from '$lib/rpc/client';

	// States related to the import functionality
	let isDragging = $state(false);
	let importedFile: File | null = $state(null);
	let convertedData: string | null = $state(null); // Potentially for a direct .mug download link if server install fails or is optional
	let errorMessage = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let isConverting = $state(false);
	let conversionProgress = $state<string>('');

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

	async function uploadAndProcessFile(file: File, onProgress?: (msg: string) => void) {
		onProgress?.(`Uploading ${file.name}...`);

		const formData = new FormData();
		// Append the raw file under the key 'levelFile' as expected by the server
		formData.append('levelFile', file, file.name); // Pass file name for the server

		try {
			const response = await orpcClient.song.install({
				file: file
			});

			// The server will send progress updates (if implemented) or just the final result
			// For now, we just wait for the final response and display its message.

			if (!response.success) {
				const errorMessage = response.message;
				console.error('Server error during processing:', errorMessage);
				return { success: false, message: `Failed to install song: ${errorMessage}` };
			}

			onProgress?.(response.message);

			return response;
		} catch (error: any) {
			console.error('Network error during upload:', error);
			onProgress?.(''); // Clear progress message or show network error
			return { success: false, message: 'Network error or connection issue: ' + error.message };
		}
	}

	async function handleFile(file: File) {
		// Initialize state
		importedFile = file;
		isConverting = true;
		errorMessage = null;
		conversionProgress = '';
		convertedData = null;

		// Validate file type
		if (!file.name.endsWith('.osz') && !file.name.endsWith('.mug')) {
			errorMessage = 'Invalid file type. Please use .osz or .mug files.';
			isConverting = false;
			importedFile = null;
			return;
		}

		// Process file
		const result = await uploadAndProcessFile(file, (msg) => (conversionProgress = msg));
		errorMessage = result.message;
		isConverting = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			const fileToHandle = files[0];
			if (fileToHandle.name.endsWith('.osz') || fileToHandle.name.endsWith('.mug')) {
				handleFile(fileToHandle);
			} else {
				errorMessage = 'Please drop a valid .osz or .mug file';
			}
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			const fileToHandle = input.files[0];
			if (fileToHandle.name.endsWith('.osz') || fileToHandle.name.endsWith('.mug')) {
				handleFile(fileToHandle);
			} else {
				errorMessage = 'Please select a valid .osz or .mug file';
			}
			input.value = '';
		}
	}

	function triggerFileInput() {
		fileInput.click();
	}

	function downloadConvertedFile() {
		if (!convertedData) {
			console.warn('No data available for download for ImportLevel component.');
			errorMessage = 'No file data available for download.'; // Inform user
			return;
		}
		const a = document.createElement('a');
		a.href = convertedData;
		a.download = importedFile?.name.replace(/\.(osz|mug)$/, '.mug') || 'converted.mug';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
</script>

<div
	class="group block bg-gradient-to-r from-yellow-500 to-amber-600 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out"
>
	<h2
		class="text-3xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors flex items-center"
	>
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
	<p class="text-md text-amber-100 mb-4">Import and convert .osz or .mug files</p>

	<input
		type="file"
		accept=".osz,.mug"
		class="hidden"
		bind:this={fileInput}
		onchange={handleFileSelect}
	/>

	<div
		class="border-2 border-dashed border-white/30 rounded-lg p-8 text-center transition-colors cursor-pointer {isDragging
			? 'border-yellow-200 bg-yellow-500/20'
			: 'hover:border-yellow-200'}"
		role="button"
		tabindex="0"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		onclick={triggerFileInput}
		onkeydown={(e) => e.key === 'Enter' && triggerFileInput()}
	>
		{#if !importedFile}
			<div class="text-white/80">
				Drag and drop your .osz or .mug file here<br />
				or click to select a file
			</div>
		{:else}
			<div class="text-white/80">
				File loaded: {importedFile.name}<br />
				{#if isConverting}
					<div class="text-yellow-200 mt-2">{conversionProgress}</div>
				{:else if convertedData}
					<button
						class="mt-4 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded transition-colors"
						onclick={(e) => {
							e.stopPropagation();
							downloadConvertedFile();
						}}
					>
						Download Converted File
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if errorMessage}
		<p class="text-red-200 mt-2 text-sm">{errorMessage}</p>
	{/if}
</div>
