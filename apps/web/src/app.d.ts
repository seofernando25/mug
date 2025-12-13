// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			finalScore?: number;
			maxCombo?: number;
			score?: number;
			songData?: import("$lib/types").ClientSong;
			chartData?: import("$lib/types").ClientChart;
			songId?: string;
			chartDifficultyName?: string;
			roomId?: string;
		}
		// interface Platform {}
	}
}

export {};
