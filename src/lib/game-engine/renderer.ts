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
	private notePool: NotePool;
	private highwayMetricsStore;
	private receptorPositions;
	private receptorSize;
	private highway;
	private receptors;
	private keyPressEffects;
	private judgmentTextsByLane: Record<number, ReturnType<typeof drawJudgmentText> | null> = {};
	private scrollSpeed: number;

	constructor(opts: RendererOptions) {
		this.scrollSpeed = opts.scrollSpeed ?? 1.0;
		this.app = new Application();
		this.mainContainer = new Container();

		this.app.init({
			canvas: opts.canvas,
			width: opts.canvas.clientWidth,
			height: opts.canvas.clientHeight,
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
			([height, width]) => getHighwayMetrics(opts.lanes, width, height)
		);
		this.notePool = new NotePool(this.mainContainer, get(this.highwayMetricsStore).laneWidth);
		this.receptorPositions = getReceptorPositions(this.highwayMetricsStore);
		this.receptorSize = derived([appHeight, appWidth], ([height, width]) => getReceptorSize(width, height));

		this.app.stage.addChild(this.mainContainer);
		this.highway = drawHighway(this.app, this.mainContainer, this.highwayMetricsStore);
		this.receptors = drawReceptor(this.mainContainer, this.receptorPositions, this.receptorSize);
		this.keyPressEffects = drawKeyPressEffects(this.mainContainer, opts.lanes);
	}

	render(state: GameState, timeMs: number) {
		const metrics = get(this.highwayMetricsStore);
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
		const metrics = get(this.highwayMetricsStore);
		this.highway?.redraw?.();
		this.app.renderer.resize(metrics.width, metrics.height);
	}

	destroy() {
		this.highway?.destroy?.();
		this.app?.destroy({ children: true, texture: true, baseTexture: true } as any);
	}
}

