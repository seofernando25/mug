import { drawHighway, getHighwayMetrics } from "./rendering/highway";
import { drawJudgmentText } from "./rendering/judgment";
import { drawKeyPressEffects } from "./rendering/keypress";
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
	canvas: HTMLCanvasElement;
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
	private keyPressEffects: ReturnType<typeof drawKeyPressEffects> | null = null;
	private judgmentTextsByLane: Record<
		number,
		ReturnType<typeof drawJudgmentText> | null
	> = {};
	private scrollSpeed: number;
	private initialized = false;
	private opts: RendererOptions;
	private lastRenderTimeMs: number | null = null;
	private appWidth!: Writable<number>;
	private appHeight!: Writable<number>;
	private lanes: number;

	constructor(opts: RendererOptions) {
		this.opts = opts;
		this.scrollSpeed = opts.scrollSpeed ?? 1.0;
		this.lanes = opts.lanes;
		this.app = new Application();
		this.mainContainer = new Container();
	}

	async init() {
		const { canvas } = this.opts;

		await this.app.init({
			canvas,
			width: canvas.clientWidth,
			height: canvas.clientHeight,
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
			backgroundColor: 0x000000,
			backgroundAlpha: 0.0,
		});

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
		this.keyPressEffects = drawKeyPressEffects(this.mainContainer, this.lanes);
		this.initialized = true;
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
		);

		// Animate and clean up judgment texts
		for (const laneKey of Object.keys(this.judgmentTextsByLane)) {
			const lane = Number(laneKey);
			const jt = this.judgmentTextsByLane[lane];
			if (!jt) continue;
			jt.updateAnimation(deltaMs);
			// Fallback absolute lifetime of 800ms even if alpha doesn't reach 0 (safety)
			if (jt.alpha <= 0.01 || jt.creationTime + 800 <= timeMs) {
				jt.parent?.removeChild(jt);
				jt.destroy();
				this.judgmentTextsByLane[lane] = null;
			}
		}
	}

	flashLane(lane: number) {
		if (this.receptors?.receptors?.[lane]) {
			this.receptors.receptors[lane].flash();
		}
	}

	showJudgment(lane: number, judgment: string, color?: number) {
		const rp = get(this.receptorPositions);
		const metrics = get(this.highwayMetricsStore);
		const yPos = rp?.[lane]?.y ?? 0;
		// Clean up any existing judgment on this lane before drawing a new one
		const existing = this.judgmentTextsByLane[lane];
		if (existing) {
			existing.parent?.removeChild(existing);
			existing.destroy();
			this.judgmentTextsByLane[lane] = null;
		}
		const text = drawJudgmentText(
			this.app,
			this.mainContainer,
			judgment,
			lane,
			metrics?.x ?? 0,
			metrics?.laneWidth ?? 0,
			yPos,
		);
		this.judgmentTextsByLane[lane] = text;
	}

	handleResize(songTimeMs?: number) {
		if (!this.initialized) return;

		// Get actual canvas dimensions
		const canvas = this.opts.canvas;
		const newWidth = canvas.clientWidth;
		const newHeight = canvas.clientHeight;

		// Update the dimension stores to trigger highway metrics recalculation
		this.appWidth.set(newWidth);
		this.appHeight.set(newHeight);

		// Get the updated metrics
		const metrics = get(this.highwayMetricsStore);

		// Redraw notes if we have the current song time
		if (songTimeMs !== undefined && this.notePool) {
			redrawNoteGraphicsOnResize(
				this.notePool,
				metrics.x,
				metrics.laneWidth,
				songTimeMs,
				metrics.receptorYPosition,
				metrics.receptorYPosition,
				this.scrollSpeed,
				metrics.height,
			);
		}

		// Redraw highway with new metrics
		this.highway?.redraw?.();

		// Resize PIXI renderer to new dimensions
		this.app.renderer.resize(newWidth, newHeight);
	}

	destroy() {
		this.highway?.destroy?.();
		this.app.destroy();
	}
}
