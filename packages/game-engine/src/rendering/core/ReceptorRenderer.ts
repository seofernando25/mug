import * as PIXI from 'pixi.js';
import { atom, computed, effect, type Atom } from 'nanostores';

// Shared configuration store for receptors
export const receptorConfig = {
	laneWidth: atom(75),
	receptorHeight: atom(50), 
	baseColor: atom(0xaa3333),
	activeColor: atom(0xffffff),
	baseAlpha: atom(0.7),
	activeAlpha: atom(0.9),
};

// Shared state store for receptor activation
export const receptorActiveLanes = atom<Set<number>>(new Set());

export function setReceptorActive(lane: number, active: boolean) {
	const current = receptorActiveLanes.get();
	const next = new Set(current);
	if (active) {
		next.add(lane);
	} else {
		next.delete(lane);
	}
	receptorActiveLanes.set(next);
}

const singleReceptorRenderer = (ctx: {
	lane: number,
	receptorActiveLanes: Atom<Set<number>>,
	baseColor: Atom<number>,
	activeColor: Atom<number>,
	baseAlpha: Atom<number>,
	activeAlpha: Atom<number>
}) => {
	const g = new PIXI.Graphics();
	const width = 4 * 12;
	const height = 4 * 12;

	const redraw = effect([
		ctx.receptorActiveLanes,
		ctx.baseColor,
		ctx.activeColor,
		ctx.baseAlpha,
		ctx.activeAlpha
	], (activeLanes, baseColor, activeColor, baseAlpha, activeAlpha) => {
		g.clear();
		const isActive = activeLanes.has(ctx.lane);
		g.rect(0, 0, width, height)
			.fill({
				color: isActive ? activeColor : baseColor,
				alpha: isActive ? activeAlpha : baseAlpha
			});

		if (isActive) {
			g.rect(0, 0, width, height)
				.fill({
					color: 0xffffff,
					alpha: 0.3
				});
		}
	});

	g.context.on("destroy", () => {
		redraw();
	});

	g.pivot.set(width/2, 0);

	return g;
}

export const receptorRenderer = (ctx: {
	numLanes: Atom<number>,
	screenSize: Atom<{ width: number, height: number }>,
	laneSpace: Atom<number>,
}) => {
	const container = new PIXI.Container();
	container.label = "ReceptorRenderer";

	const cleanup: (() => void)[] = [];

	cleanup.push(effect([ctx.numLanes], (numLanes) => {
		container.removeChildren();
		const screenWidth = ctx.screenSize.get().width;

		for (let i = 0; i < numLanes; i++) {
			const receptor = singleReceptorRenderer({
				lane: i,
				receptorActiveLanes,
				baseColor: receptorConfig.baseColor,
				activeColor: receptorConfig.activeColor,
				baseAlpha: receptorConfig.baseAlpha,
				activeAlpha: receptorConfig.activeAlpha
			});

			receptor.x = screenWidth / 2 - ((numLanes - 1) * ctx.laneSpace.get()) / 2 + (i * ctx.laneSpace.get());
			receptor.y = ctx.screenSize.get().height * 0.8;

			container.addChild(receptor);
		}
	}));

	container.on("destroyed", () => {
		cleanup.forEach(fn => fn());
	});

	return container;
}
