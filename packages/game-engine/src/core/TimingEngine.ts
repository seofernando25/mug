// Simple timing utilities for time-based synchronization
// Gameplay-specific timing logic is now in the gameplay package

export class TimingEngine {
	private startTime: number = 0;
	private pausedTime: number = 0;
	private lastPauseTime: number = 0;
	private isPaused: boolean = false;

	// Set the start time for the game
	setStartTime(time: number): void {
		this.startTime = time;
	}

	// Pause timing
	pause(currentTime: number): void {
		if (!this.isPaused) {
			this.lastPauseTime = currentTime;
			this.isPaused = true;
		}
	}

	// Resume timing
	resume(currentTime: number): void {
		if (this.isPaused) {
			this.pausedTime += currentTime - this.lastPauseTime;
			this.isPaused = false;
		}
	}

	// Get the current game time (accounting for pauses)
	getGameTime(currentTime: number): number {
		if (this.isPaused) {
			return (this.lastPauseTime - this.startTime) - this.pausedTime;
		}
		return (currentTime - this.startTime) - this.pausedTime;
	}

	// Reset timing state
	reset(): void {
		this.startTime = 0;
		this.pausedTime = 0;
		this.lastPauseTime = 0;
		this.isPaused = false;
	}

	// Get timing state for synchronization
	getTimingState() {
		return {
			startTime: this.startTime,
			pausedTime: this.pausedTime,
			lastPauseTime: this.lastPauseTime,
			isPaused: this.isPaused
		};
	}

	// Set timing state from synchronization
	setTimingState(state: { startTime: number; pausedTime: number; lastPauseTime: number; isPaused: boolean }): void {
		this.startTime = state.startTime;
		this.pausedTime = state.pausedTime;
		this.lastPauseTime = state.lastPauseTime;
		this.isPaused = state.isPaused;
	}
} 