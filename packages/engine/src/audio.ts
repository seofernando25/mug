/**
 * Generic interface for audio playback to decouple the engine from specific libraries.
 */
export interface AudioInstance {
	/**
	 * Play the audio.
	 * @param onComplete Callback when audio finishes playing
	 */
	play(onComplete?: () => void): void;

	/**
	 * Pause the audio.
	 */
	pause(): void;

	/**
	 * Resume the audio.
	 */
	resume(): void;

	/**
	 * Stop the audio and reset position.
	 */
	stop(): void;

	/**
	 * Seek to a specific time in seconds.
	 */
	seek(timeSeconds: number): void;

	/**
	 * Current playback time in seconds.
	 */
	readonly currentTime: number;

	/**
	 * Total duration of the audio in seconds.
	 */
	readonly duration: number;

	/**
	 * Whether the audio is currently playing.
	 */
	readonly isPlaying: boolean;

	/**
	 * Volume level (0.0 to 1.0).
	 */
	volume: number;

	/**
	 * Cleanup resources.
	 */
	destroy(): void;
}

/**
 * Web Audio API implementation of the AudioInstance interface.
 */
export class WebAudioInstance implements AudioInstance {
	private audioContext: AudioContext;
	private buffer: AudioBuffer;
	private source: AudioBufferSourceNode | null = null;
	private gainNode: GainNode;
	private startTime: number = 0;
	private pausedAt: number = 0;
	private _isPlaying: boolean = false;
	private _volume: number = 1.0;
	private onCompleteCallback?: () => void;

	constructor(audioContext: AudioContext, buffer: AudioBuffer) {
		this.audioContext = audioContext;
		this.buffer = buffer;
		this.gainNode = this.audioContext.createGain();
		this.gainNode.connect(this.audioContext.destination);
	}

	static async fromUrl(audioContext: AudioContext, url: string): Promise<WebAudioInstance> {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
		return new WebAudioInstance(audioContext, audioBuffer);
	}

	play(onComplete?: () => void): void {
		if (this._isPlaying) return;

		this.onCompleteCallback = onComplete;
		this.source = this.audioContext.createBufferSource();
		this.source.buffer = this.buffer;
		this.source.connect(this.gainNode);
		
		this.source.onended = () => {
			if (this._isPlaying) {
				this._isPlaying = false;
				this.onCompleteCallback?.();
			}
		};

		const offset = this.pausedAt;
		this.source.start(0, offset);
		this.startTime = this.audioContext.currentTime - offset;
		this._isPlaying = true;
	}

	pause(): void {
		if (!this._isPlaying) return;
		this.pausedAt = this.audioContext.currentTime - this.startTime;
		this.stopSource();
	}

	resume(): void {
		if (this._isPlaying) return;
		this.play(this.onCompleteCallback);
	}

	stop(): void {
		this.pausedAt = 0;
		this.stopSource();
	}

	seek(timeSeconds: number): void {
		const wasPlaying = this._isPlaying;
		this.stopSource();
		this.pausedAt = Math.max(0, Math.min(timeSeconds, this.duration));
		if (wasPlaying) {
			this.play(this.onCompleteCallback);
		}
	}

	private stopSource(): void {
		if (this.source) {
			this.source.onended = null;
			try {
				this.source.stop();
			} catch (e) {
				// Ignore errors if source already stopped
			}
			this.source.disconnect();
			this.source = null;
		}
		this._isPlaying = false;
	}

	get currentTime(): number {
		if (this._isPlaying) {
			return this.audioContext.currentTime - this.startTime;
		}
		return this.pausedAt;
	}

	get duration(): number {
		return this.buffer.duration;
	}

	get isPlaying(): boolean {
		return this._isPlaying;
	}

	get volume(): number {
		return this._volume;
	}

	set volume(value: number) {
		this._volume = value;
		this.gainNode.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
	}

	destroy(): void {
		this.stop();
		this.gainNode.disconnect();
	}
}
