// src/lib/client/api.ts
export interface SongListItem {
	id: string;
	title: string;
	artist: string;
	imageUrl?: string; // Optional: for song cover art in the list
	difficulties: string[];
}

export interface ChartListItem {
	id: string;
	difficultyName: string;
	lanes: number;
	noteScrollSpeed: number;
}

export interface SongDetail extends SongListItem {
	bpm: number;
	previewStartTime: number;
	audioUrl: string;
	uploadDate: string; // Or Date
	charts: ChartListItem[];
	// Add other detailed fields your /api/song/[songId] endpoint returns
}

export interface SongListResponse {
	songs: SongListItem[];
	error?: string;
}

export interface SongDetailResponse {
	song?: SongDetail;
	error?: string;
}

/**
 * Fetches the list of songs from the server.
 * Assumes /api/list-songs returns an array of SongListItem.
 */
export async function fetchSongs(): Promise<SongListResponse> {
	try {
		const response = await fetch('/api/list-songs');
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Failed to fetch songs and could not parse error response.' }));
			console.error('Error fetching songs:', response.status, errorData);
			return { songs: [], error: errorData.message || `HTTP error ${response.status}` };
		}
		const data = await response.json();
		// Ensure the data matches the expected structure; providing default if not.
		return { songs: data.songs || [], error: data.error };
	} catch (e: any) {
		console.error('Network or other error fetching songs:', e);
		return { songs: [], error: e.message || 'An unexpected error occurred.' };
	}
}

/**
 * Fetches the full details for a single song from the server.
 */
export async function fetchSongDetails(songId: string): Promise<SongDetailResponse> {
	try {
		const response = await fetch(`/api/song/${songId}`);
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Failed to fetch song details and could not parse error response.' }));
			console.error(`Error fetching song details for ${songId}:`, response.status, errorData);
			return { song: undefined, error: errorData.message || `HTTP error ${response.status}` };
		}
		const songData = await response.json();
		return { song: songData as SongDetail }; // Assume direct cast works, or transform data
	} catch (e: any) {
		console.error(`Network or other error fetching song details for ${songId}:`, e);
		return { song: undefined, error: e.message || 'An unexpected error occurred.' };
	}
}

// You can add other client-side API functions here, for example:
// export async function fetchSongDetails(songId: string): Promise<SongDetailResponse> { ... } 