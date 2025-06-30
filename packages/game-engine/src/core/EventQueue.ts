import type { EventHandler, GameEvent } from './GameEvents';

export interface QueuedEvent {
	event: GameEvent;
	scheduledTime: number; // When this event should be processed
}

export class EventQueue {
	private queue: QueuedEvent[] = [];
	private handlers: Map<string, EventHandler[]> = new Map();
	private globalHandlers: EventHandler[] = [];
	private currentGameTime: number = 0;


	// Add event to queue
	enqueue(event: GameEvent, delay: number = 0): void {
		const queuedEvent: QueuedEvent = {
			event,
			scheduledTime: this.currentGameTime + delay
		};

		// Insert in chronological order (binary search for performance)
		this.insertSorted(queuedEvent);
	}

	// Add event to be processed immediately
	enqueueImmediate(event: GameEvent): void {
		this.enqueue(event, 0);
	}

	// Process all events that should happen at or before the current game time
	processEvents(gameTime: number): GameEvent[] {
		this.currentGameTime = gameTime;
		const processedEvents: GameEvent[] = [];
		
		while (this.queue.length > 0 && this.queue[0]!.scheduledTime <= gameTime) {
			const queuedEvent = this.queue.shift()!;
			this.dispatchEvent(queuedEvent.event);
			processedEvents.push(queuedEvent.event);
		}

		return processedEvents;
	}

	// Register event handler for specific event type
	on<T extends GameEvent>(eventType: T['type'], handler: EventHandler<T>): void {
		if (!this.handlers.has(eventType)) {
			this.handlers.set(eventType, []);
		}
		this.handlers.get(eventType)!.push(handler as EventHandler);
	}

	// Register global event handler (receives all events)
	onAny(handler: EventHandler): void {
		this.globalHandlers.push(handler);
	}

	// Remove event handler
	off<T extends GameEvent>(eventType: T['type'], handler: EventHandler<T>): void {
		const handlers = this.handlers.get(eventType);
		if (handlers) {
			const index = handlers.indexOf(handler as EventHandler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		}
	}

	// Remove global event handler
	offAny(handler: EventHandler): void {
		const index = this.globalHandlers.indexOf(handler);
		if (index > -1) {
			this.globalHandlers.splice(index, 1);
		}
	}

	// Clear all events from queue
	clear(): void {
		this.queue = [];
	}

	// Clear all handlers
	clearHandlers(): void {
		this.handlers.clear();
		this.globalHandlers = [];
	}

	// Get pending events (for debugging/inspection)
	getPendingEvents(): readonly QueuedEvent[] {
		return [...this.queue];
	}

	// Get next event time (useful for knowing when to wake up)
	getNextEventTime(): number | null {
		return this.queue.length > 0 ? this.queue[0]!.scheduledTime : null;
	}

	// Check if there are events pending
	hasPendingEvents(): boolean {
		return this.queue.length > 0;
	}

	// Get events in a time range (useful for prediction/lookahead)
	getEventsInRange(startTime: number, endTime: number): readonly QueuedEvent[] {
		return this.queue.filter(qe =>
			qe.scheduledTime >= startTime && qe.scheduledTime <= endTime
		);
	}

	private insertSorted(queuedEvent: QueuedEvent): void {
		let left = 0;
		let right = this.queue.length;

		// Binary search for insertion point
		while (left < right) {
			const mid = Math.floor((left + right) / 2);
			if (this.queue[mid]!.scheduledTime <= queuedEvent.scheduledTime) {
				left = mid + 1;
			} else {
				right = mid;
			}
		}

		this.queue.splice(left, 0, queuedEvent);
	}

	private dispatchEvent(event: GameEvent): void {
		console.log("dispatchEvent", event);
		// Call type-specific handlers
		const typeHandlers = this.handlers.get(event.type);
		if (typeHandlers) {
			typeHandlers.forEach(handler => {
				try {
					handler(event);
				} catch (error) {
					console.error(`Error in event handler for ${event.type}:`, error);
				}
			});
		}

		// Call global handlers
		this.globalHandlers.forEach(handler => {
			try {
				handler(event);
			} catch (error) {
				console.error(`Error in global event handler:`, error);
			}
		});
	}
} 