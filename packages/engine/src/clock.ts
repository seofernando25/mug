import type { Sound, IMediaInstance } from "@pixi/sound";

/**
 * Thin wrapper to expose an authoritative time source.
 * Keeps logic separate from Pixi and makes it mockable in tests.
 */
export class AudioClock {
	private sound: Sound;
	private instance: IMediaInstance | null = null;

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

	get currentTimeMs(): number {
		if (
			this.instance &&
			typeof this.instance.progress === "number" &&
			this.sound.duration
		) {
			return this.instance.progress * this.sound.duration * 1000;
		}

		return 0;
	}

	get isPlaying(): boolean {
		return !!(this.instance && !this.instance.paused);
	}
}
