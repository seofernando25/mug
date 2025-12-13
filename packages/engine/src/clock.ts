import type { Sound, IMediaInstance } from "@pixi/sound";

/**
 * Thin wrapper to expose an authoritative time source.
 * Keeps logic separate from Pixi and makes it mockable in tests.
 */
export class AudioClock {
	private sound: Sound;
	private instance: IMediaInstance | null = null;
	private isSeekingInternal: boolean = false; // Add this flag to prevent recursive updates

	constructor(sound: Sound) {
		this.sound = sound;
	}

	async play(onComplete?: () => void): Promise<void> {
		if (this.instance) return;

		const maybeInstance = this.sound.play(
			onComplete ? { complete: onComplete } : undefined,
		);
		this.instance = await Promise.resolve(maybeInstance);
	}

	pause() {
		if (this.instance) {
			this.instance.set("paused", true);
		}
	}

	resume() {
		if (this.instance) {
			this.instance.set("paused", false);
		}
	}

	stop() {
		this.instance?.stop();
		this.instance = null;
	}

	/**
	 * Seeks the audio playback to a specific time in milliseconds.
	 * @param timeMs The time in milliseconds to seek to.
	 */
	seek(timeMs: number): void {
		if (this.instance && this.sound.duration) {
			this.isSeekingInternal = true; // Set flag
			const durationMs = this.sound.duration * 1000;
			const clampedTimeMs = Math.max(0, Math.min(timeMs, durationMs));
			const progress = clampedTimeMs / durationMs;
			(this.instance as any).currentTime = clampedTimeMs / 1000;
			this.isSeekingInternal = false; // Reset flag
		}
	}

	get currentTimeMs(): number {
		// Check the internal flag to avoid reading progress while it's being set by seek()
		if (
			this.instance &&
			typeof this.instance.progress === "number" &&
			this.sound.duration &&
			!this.isSeekingInternal // Add condition here
		) {
			return this.instance.progress * this.sound.duration * 1000;
		}

		return 0;
	}

	get isPlaying(): boolean {
		return !!(this.instance && !this.instance.paused);
	}
}
