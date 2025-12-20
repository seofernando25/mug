import { drawHighway, getHighwayMetrics } from "./rendering/highway";
import { drawJudgmentText } from "./rendering/judgment";
import {
	drawReceptor,
	getReceptorPositions,
	getReceptorSize,
} from "./rendering/receptor";
import { NotePool } from "./rendering/NotePool";
import { updateNotes } from "./rendering/updateNotes";
import { redrawNoteGraphicsOnResize } from "./rendering/redrawNoteGraphicsOnResize";
import type { GameState } from "./types";
import type { ChartHitObject } from "./types";
import { Application, Container } from "pixi.js";
import {
	derived,
	get,
	writable,
	type Readable,
	type Writable,
} from "svelte/store";

interface RendererOptions {
	container: HTMLElement;
	lanes: number;
	scrollSpeed?: number;
}

export class GameRenderer {
	private app: Application;
	private mainContainer: Container;
	private notePool: NotePool | null = null;
	public highwayMetricsStore!: Readable<ReturnType<typeof getHighwayMetrics>>;
	private receptorPositions!: ReturnType<typeof getReceptorPositions>;
	private receptorSize!: Readable<{ width: number; height: number }>;
	private highway: ReturnType<typeof drawHighway> | null = null;
	private receptors: ReturnType<typeof drawReceptor> | null = null;
	private activeJudgments: Set<ReturnType<typeof drawJudgmentText>> = new Set();
	private scrollSpeed: number;
	private initialized = false;
	private opts: RendererOptions;
	private lastRenderTimeMs: number | null = null;
	private appWidth!: Writable<number>;
	private appHeight!: Writable<number>;
	private lanes: number;

	// Editor mode properties
	editorMode: boolean = false;
	editorViewCenterTimeMs: number = 0;
	editorPixelsPerSecond: number = 100; // Default: 100 pixels per second

	constructor(opts: RendererOptions) {
		this.opts = opts;
		this.scrollSpeed = opts.scrollSpeed ?? 1.0;
		this.lanes = opts.lanes;
		this.app = new Application();
		this.mainContainer = new Container();
	}

	async init() {
		const { container } = this.opts;

		await this.app.init({
			resizeTo: container,
			width: container.clientWidth,
			height: container.clientHeight,
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
			backgroundColor: 0x000000,
			backgroundAlpha: 0.0,
		});

		container.appendChild(this.app.canvas);

		this.appWidth = writable(this.app.screen.width);
		this.appHeight = writable(this.app.screen.height);
		this.highwayMetricsStore = derived(
			[this.appHeight, this.appWidth],
			([height, width]: [number, number]) =>
				getHighwayMetrics(this.lanes, width, height),
		);
		const initialMetrics = get(this.highwayMetricsStore);
		this.notePool = new NotePool(this.mainContainer, initialMetrics.laneWidth);
		this.receptorPositions = getReceptorPositions(this.highwayMetricsStore);
		this.receptorSize = derived(
			[this.appHeight, this.appWidth],
			([height, width]: [number, number]) => getReceptorSize(width, height),
		);

		this.app.stage.addChild(this.mainContainer);
		this.highway = drawHighway(
			this.app,
			this.mainContainer,
			this.highwayMetricsStore,
		);
		this.receptors = drawReceptor(
			this.mainContainer,
			this.receptorPositions,
			this.receptorSize,
		);
		this.initialized = true;
	}

	setEditorMode(enabled: boolean): void {
		this.editorMode = enabled;
	}

	setEditorViewport(centerTimeMs: number, pixelsPerSecond: number): void {
		this.editorViewCenterTimeMs = centerTimeMs;
		this.editorPixelsPerSecond = pixelsPerSecond;
	}

	render(state: GameState, timeMs: number) {
		if (!this.initialized || !this.notePool) return;
		const deltaMs =
			this.lastRenderTimeMs === null
				? 0
				: Math.max(0, timeMs - this.lastRenderTimeMs);
		this.lastRenderTimeMs = timeMs;

		const metrics = get(this.highwayMetricsStore);
		const judged = new Set<number>();
		const visible = state.notes.map((n) => {
			if (n.isHit || n.isMissed || n.holdBroken) judged.add(Number(n.id));
			return {
				...n,
				isActivelyHeld: n.isHolding,
			} as ChartHitObject & { isActivelyHeld?: boolean };
		});

		updateNotes(
			timeMs,
			this.notePool,
			metrics.x,
			metrics.laneWidth,
			metrics.receptorYPosition,
			metrics.receptorYPosition,
			this.scrollSpeed ?? 1,
			this.app.screen.height,
			visible,
			judged,
			this.editorMode, // Pass editor mode flag
			this.editorViewCenterTimeMs, // Pass editor viewport center time
			this.editorPixelsPerSecond, // Pass editor pixels per second (zoom)
		);

		// Animate and clean up judgment texts
		for (const jt of this.activeJudgments) {
			jt.updateAnimation(deltaMs);
			// Fallback absolute lifetime of 800ms
			if (jt.alpha <= 0.01 || jt.creationTime + 800 <= timeMs) {
				jt.parent?.removeChild(jt);
				jt.destroy();
				this.activeJudgments.delete(jt);
			}
		}
	}

	flashLane(lane: number) {
		if (this.receptors?.receptors?.[lane]) {
			this.receptors.receptors[lane].flash();
		}
	}

	showJudgment(lane: number, judgment: string, _color?: number) {
		const metrics = get(this.highwayMetricsStore);
		// Center on highway, slightly above receptors
		const centerX = metrics.x + metrics.width / 2;
		const yPos = metrics.receptorYPosition - metrics.height * 0.1; // 10% up from receptors

		const text = drawJudgmentText(
			this.app,
			this.mainContainer,
			judgment,
			centerX,
			yPos,
		);
		this.activeJudgments.add(text);
	}

	handleResize(songTimeMs?: number) {
		if (!this.initialized) return;

		// Get actual container dimensions
		const container = this.opts.container;
		const newWidth = container.clientWidth;
		const newHeight = container.clientHeight;

		// Update the dimension stores to trigger highway metrics recalculation
		this.appWidth.set(newWidth);
		this.appHeight.set(newHeight);

		// Get the updated metrics
		const metrics = get(this.highwayMetricsStore);

		// Redraw notes if we have the current song time
		if (this.notePool) {
			redrawNoteGraphicsOnResize(
				this.notePool,
				metrics.x,
				metrics.laneWidth,
				songTimeMs ?? 0, // Provide default value 0 for songTimeMs
				metrics.receptorYPosition,
				metrics.receptorYPosition,
				this.scrollSpeed,
				metrics.height,
				this.editorMode, // Pass editor mode flag
				this.editorViewCenterTimeMs, // Pass editor viewport center time
				this.editorPixelsPerSecond, // Pass editor pixels per second (zoom)
			);
		}

		// Redraw highway with new metrics
		this.highway?.redraw?.();

		// Resize PIXI renderer to new dimensions (Pixi handles canvas resize if resizeTo is set, but explicit resize is safer)
		this.app.renderer.resize(newWidth, newHeight);
	}

	destroy() {
		this.notePool?.destroy();
		this.highway?.destroy?.();
		this.app.canvas?.parentElement?.removeChild(this.app.canvas);
		this.app.destroy({ removeView: true }, { children: true, texture: true, textureGC: true, baseTexture: true });
	}
}
