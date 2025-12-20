import type { AudioInstance } from './audio';

/**
 * Thin wrapper to expose an authoritative time source.
 * Keeps logic separate from specific audio implementations and makes it mockable in tests.
 */
export class AudioClock {
	private audio: AudioInstance;

	constructor(audio: AudioInstance) {
		this.audio = audio;
	}

	play(onComplete?: () => void): void {
		this.audio.play(onComplete);
	}

	pause() {
		console.log('Pausing audio');
		this.audio.pause();
	}

	resume() {
		this.audio.resume();
	}

	stop() {
		this.audio.stop();
	}

	/**
	 * Seeks the audio playback to a specific time in milliseconds.
	 * @param timeMs The time in milliseconds to seek to.
	 */
	seek(timeMs: number): void {
		this.audio.seek(timeMs / 1000);
	}

	get currentTimeMs(): number {
		return this.audio.currentTime * 1000;
	}

	get isPlaying(): boolean {
		return this.audio.isPlaying;
	}
}
