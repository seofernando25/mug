// Types for rendering module
import type { Graphics, Container, Text, Application } from 'pixi.js';
import type { NoteGraphicsEntry, BeatLineEntry as GeneralBeatLineEntry } from '$lib/game';
import type { GameplaySizing as GameplaySizingClass } from '$lib/game'; // Corrected path

export type NoteGraphics = NoteGraphicsEntry;
export type BeatLineEntry = GeneralBeatLineEntry;

export interface StageDimensions {
    width: number;
    height: number;
}

export interface HighwayGraphics {
    container: Container;
    mainRects: Graphics;
    lines: Graphics;
    redraw: (metrics: ReturnType<typeof GameplaySizingClass.getHighwayMetrics>) => void;
    destroy: () => void;
}

export interface BeatLineGraphics {
    container: Container;
    lines: BeatLineEntry[];
    destroy: () => void;
}

export interface KeyPressEffectGraphics {
    container: Container;
    visuals: Graphics;
    laneData: Array<{ activationTime: number, currentAlpha: number }>;
    redraw: (receptorPositions: { x: number, y: number }[], receptorSize: { width: number, height: number }) => void;
    destroy: () => void;
}

export interface ReceptorGraphics {
    container: Container;
    receptors: { graphics: Graphics, flash: () => void, press: () => void, release: () => void }[];
    redraw: (positions: { x: number; y: number }[], size: { width: number; height: number }) => void;
    destroy: () => void;
}

export interface JudgmentText extends Text {
    creationTime: number;
    lane: number;
    updateAnimation: (deltaMs: number) => void;
}

// For updateNotes function context
export interface NoteContext {
    songTimeMs: number;
    scrollSpeed: number;
    stage: StageDimensions;
    lanes: number;
    highwayX: number;
    highwayWidth: number;
    laneWidth: number;
    hitZoneY: number;
    pixiStage: Container;
    deltaSeconds: number;
} 