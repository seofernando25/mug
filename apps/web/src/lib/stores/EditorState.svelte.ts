// apps/web/src/lib/stores/EditorState.svelte.ts

// import { $state, $derived } from 'svelte/compiler'; // Svelte 5 runes are globally available

import type { ChartHitObject, ClientChart } from '@mug/contract'; // Import types from @mug/contract

// 1. Define Command Interface
interface Command {
    execute(): void;
    undo(): void;
}

// 2. Implement Concrete Commands
class PlaceNoteCommand implements Command {
    constructor(
        private editorState: EditorState,
        private note: ChartHitObject,
    ) {}

    execute(): void {
        this.editorState._addNoteInternal(this.note);
    }

    undo(): void {
        this.editorState._removeNoteInternal(this.note.id);
    }
}

class DeleteNoteCommand implements Command {
    private deletedNote: ChartHitObject | undefined;

    constructor(
        private editorState: EditorState,
        private noteId: number,
    ) {}

    execute(): void {
        this.deletedNote = this.editorState._removeNoteInternal(this.noteId);
    }

    undo(): void {
        if (this.deletedNote) {
            this.editorState._addNoteInternal(this.deletedNote);
        }
    }
}

class ResizeHoldCommand implements Command {
    private oldDuration: number | undefined;

    constructor(
        private editorState: EditorState,
        private noteId: number,
        private newDuration: number,
    ) {}

    execute(): void {
        this.oldDuration = this.editorState._getNoteDurationInternal(this.noteId);
        this.editorState._setNoteDurationInternal(this.noteId, this.newDuration);
    }

    undo(): void {
        if (this.oldDuration !== undefined) {
            this.editorState._setNoteDurationInternal(this.noteId, this.oldDuration);
        }
    }
}

// 3. EditorState Class leveraging Svelte 5 Runes
export class EditorState {
    // Reactive state for the chart data
    private _chartData: ClientChart = $state({
        id: `new-chart-${Date.now()}`,
        songId: 'default-song-id', // Placeholder, should be set when loading/creating a new chart
        difficultyName: 'Easy',
        lanes: 4,
        noteScrollSpeed: 1.0,
        lyrics: null,
        hitObjects: [],
    });

    // Reactive history stack for undo/redo
    private _history: Command[] = $state([]);
    private _historyPointer: number = $state(-1); // -1 signifies no actions in history yet

    // Viewport state for the editor
    private _scrollTime: number = $state(0); // Current time in ms at the center of the viewport
    private _zoom: number = $state(100); // Pixels per second

    // Publicly exposed reactive chart data
    get chart(): ClientChart {
        return this._chartData;
    }

    // Publicly exposed reactive viewport state
    get scrollTime(): number { return this._scrollTime; }
    get zoom(): number { return this._zoom; }

    // Viewport control methods
    scrollBy(deltaMs: number): void {
        // Clamp scrollTime between 0 and a reasonable max (e.g., 5 minutes or song duration)
        const maxScrollTime = 5 * 60 * 1000; // 5 minutes in ms
        this._scrollTime = Math.max(0, Math.min(this._scrollTime + deltaMs, maxScrollTime));
    }

    zoomBy(delta: number): void {
        // Clamp zoom between 10 and 1000
        this._zoom = Math.max(10, Math.min(this._zoom + delta, 1000));
    }

    // Public mutation methods (each creates and executes a command)
    placeNote(note: ChartHitObject): void {
        this._executeCommand(new PlaceNoteCommand(this, note));
    }
    deleteNote(noteId: number): void {
        this._executeCommand(new DeleteNoteCommand(this, noteId));
    }
    resizeHold(noteId: number, newDuration: number): void {
        this._executeCommand(new ResizeHoldCommand(this, noteId, newDuration));
    }
    // Add other mutation methods for moving notes, changing properties, etc.

    // Undo/Redo functionality
    undo(): void {
        if (this._historyPointer >= 0) {
            this._history[this._historyPointer].undo();
            this._historyPointer--;
        }
    }
    redo(): void {
        if (this._historyPointer < this._history.length - 1) {
            this._historyPointer++;
            this._history[this._historyPointer].execute();
        }
    }

    // Derived state for UI (e.g., enabling/disabling Undo/Redo buttons)
    canUndo = $derived(this._historyPointer >= 0);
    canRedo = $derived(this._historyPointer < this._history.length - 1);

    // Internal methods for direct chart modification (only called by commands)
    _addNoteInternal(note: ChartHitObject): void {
        this._chartData.hitObjects = [...this._chartData.hitObjects, note];
        this._chartData.hitObjects.sort((a: ChartHitObject, b: ChartHitObject) => a.time - b.time); // Maintain sorted order
    }
    _removeNoteInternal(noteId: number): ChartHitObject | undefined {
        const index = this._chartData.hitObjects.findIndex((n: ChartHitObject) => n.id === noteId);
        if (index > -1) {
            const [removed] = this._chartData.hitObjects.splice(index, 1);
            this._chartData.hitObjects = [...this._chartData.hitObjects]; // Trigger reactivity
            return removed;
        }
        return undefined;
    }
    _getNoteDurationInternal(noteId: number): number | undefined {
        const note = this._chartData.hitObjects.find((n: ChartHitObject) => n.id === noteId);
        return note?.duration ?? undefined;
    }
    _setNoteDurationInternal(noteId: number, newDuration: number): void {
        const note = this._chartData.hitObjects.find((n: ChartHitObject) => n.id === noteId);
        if (note && note.note_type === 'hold') {
            note.duration = newDuration;
            this._chartData.hitObjects = [...this._chartData.hitObjects]; // Trigger reactivity
        }
    }

    // Private helper to execute command and manage the history stack
    private _executeCommand(command: Command): void {
        // If not at the end of history, truncate "future" (undone) commands
        if (this._historyPointer < this._history.length - 1) {
            this._history = this._history.slice(0, this._historyPointer + 1);
        }
        command.execute();
        this._history.push(command);
        this._historyPointer = this._history.length - 1;
    }

    // Method to load an existing chart into the editor, clearing history
    loadChart(chart: ClientChart): void {
        this._chartData = chart;
        this._history = [];
        this._historyPointer = -1;
    }
}
