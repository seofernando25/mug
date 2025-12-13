import type { Sound, IMediaInstance } from '@pixi/sound';

/**
 * Thin wrapper to expose an authoritative time source.
 * Keeps logic separate from Pixi and makes it mockable in tests.
 */
export class AudioClock {
	private sound: Sound;
	private instance: IMediaInstance | null = null;
	// For future fallback handling; currently unused but reserved
	private fallbackOffset = 0;
	private startTime = 0;

	constructor(sound: Sound) {
		this.sound = sound;
	}

	async play(): Promise<void> {
		if (this.instance) return;

		// Reset timing trackers
		this.startTime = performance.now();
		this.fallbackOffset = 0;

		const maybeInstance = this.sound.play();
		this.instance = await Promise.resolve(maybeInstance);
	}

	pause() {
		if (this.instance) {
			this.instance.set('paused', true);
		}
	}

	resume() {
		if (this.instance) {
			this.instance.set('paused', false);
		}
	}

	stop() {
		this.instance?.stop();
		this.instance = null;
	}

	get currentTimeMs(): number {
		// Prefer authoritative audio progress
		if (this.instance && typeof this.instance.progress === 'number' && this.sound.duration) {
			return this.instance.progress * this.sound.duration * 1000;
		}

		// Fallback: wall clock (safer to return 0 if audio isn't ready)
		return 0;
	}

	get isPlaying(): boolean {
		return !!(this.instance && !this.instance.paused);
	}
}

