import { drawHighway, getHighwayMetrics } from './rendering/highway';
import { drawJudgmentText } from './rendering/judgment';
import { drawKeyPressEffects } from './rendering/keypress';
import { drawReceptor, getReceptorPositions, getReceptorSize } from './rendering/receptor';
import { NotePool } from './rendering/NotePool';
import { updateNotes } from './rendering/updateNotes';
import type { GameState } from './types';
import { Application, Container } from 'pixi.js';
import { derived, get, writable } from 'svelte/store';

interface RendererOptions {
	canvas: HTMLCanvasElement;
	lanes: number;
	scrollSpeed?: number;
}

export class GameRenderer {
	private app: Application;
	private mainContainer: Container;
	private notePool: NotePool | null = null;
	private highwayMetricsStore: any;
	private receptorPositions: any;
	private receptorSize: any;
	private highway: any;
	private receptors: any;
	private keyPressEffects: any;
	private judgmentTextsByLane: Record<number, ReturnType<typeof drawJudgmentText> | null> = {};
	private scrollSpeed: number;
	private initialized = false;
	private opts: RendererOptions;
	private lastRenderTimeMs: number | null = null;

	constructor(opts: RendererOptions) {
		this.opts = opts;
		this.scrollSpeed = opts.scrollSpeed ?? 1.0;
		this.app = new Application();
		this.mainContainer = new Container();
	}

	async init() {
		const { canvas, lanes } = this.opts;

		await this.app.init({
			canvas,
			width: canvas.clientWidth,
			height: canvas.clientHeight,
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
			backgroundColor: 0x000000,
			backgroundAlpha: 0.0
		});

		const appWidth = writable(this.app.screen.width);
		const appHeight = writable(this.app.screen.height);
		this.highwayMetricsStore = derived(
			[appHeight, appWidth],
			([height, width]) => getHighwayMetrics(lanes, width, height)
		);
		const initialMetrics = get(this.highwayMetricsStore) as any;
		this.notePool = new NotePool(this.mainContainer, initialMetrics.laneWidth);
		this.receptorPositions = getReceptorPositions(this.highwayMetricsStore);
		this.receptorSize = derived([appHeight, appWidth], ([height, width]) => getReceptorSize(width, height));

		this.app.stage.addChild(this.mainContainer);
		this.highway = drawHighway(this.app, this.mainContainer, this.highwayMetricsStore);
		this.receptors = drawReceptor(this.mainContainer, this.receptorPositions, this.receptorSize);
		this.keyPressEffects = drawKeyPressEffects(this.mainContainer, lanes);
		this.initialized = true;
	}

	render(state: GameState, timeMs: number) {
		if (!this.initialized || !this.notePool) return;
		const deltaMs =
			this.lastRenderTimeMs === null ? 0 : Math.max(0, timeMs - this.lastRenderTimeMs);
		this.lastRenderTimeMs = timeMs;

		const metrics = get(this.highwayMetricsStore) as any;
		const judged = new Set<number>();
		const visible = state.notes.map((n) => {
			if (n.isHit || n.isMissed || n.holdBroken) judged.add(Number(n.id));
			return {
				...n,
				isActivelyHeld: n.isHolding
			};
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
			visible as any,
			judged as any
		);

		// Animate and clean up judgment texts
		for (const laneKey of Object.keys(this.judgmentTextsByLane)) {
			const lane = Number(laneKey);
			const jt = this.judgmentTextsByLane[lane];
			if (!jt) continue;
			(jt as any).updateAnimation?.(deltaMs);
			// Fallback absolute lifetime of 800ms even if alpha doesn't reach 0 (safety)
			if (jt.alpha <= 0.01 || (jt as any).creationTime + 800 <= timeMs) {
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
		const rp = get(this.receptorPositions) as any;
		const metrics = get(this.highwayMetricsStore) as any;
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
			yPos
		);
		this.judgmentTextsByLane[lane] = text;
	}

	handleResize() {
		if (!this.initialized) return;
		const metrics = get(this.highwayMetricsStore) as any;
		this.highway?.redraw?.();
		this.app.renderer.resize(metrics.width, metrics.height);
	}

	destroy() {
		this.highway?.destroy?.();
		this.app?.destroy({ children: true, texture: true, baseTexture: true } as any);
	}
}

