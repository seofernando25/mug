import { computed, effect, type Atom } from 'nanostores';
import * as PIXI from 'pixi.js';

const singleLaneRenderer = (ctx: {
	virtualScreenHeight: Atom<number>,
	fillColor: Atom<number>,
	fillAlpha: Atom<number>,
}) => {
	const vPadding = 16;
	const g = new PIXI.Graphics();
	const laneWidth = 4 * 13;
	const redraw = effect([ctx.fillColor, ctx.fillAlpha, ctx.virtualScreenHeight],
		(fillColor, fillAlpha, virtualScreenHeight) => {
		g.clear();
		g.rect(0, vPadding, laneWidth, virtualScreenHeight - vPadding * 2);
		g.fill({
			color: fillColor,
			alpha: fillAlpha
		});		
	});

	g.context.on("destroy", () => {
		redraw();
	});

	g.pivot.set(laneWidth/2, 0);

	return g;
}


export const highwayRenderer = (ctx: {
	numLanes: Atom<number>,
	screenSize: Atom<{ width: number, height: number }>,
	fillColor: Atom<number>,
	fillAlpha: Atom<number>,
	laneSpace: Atom<number>,
}) => {

	const container = new PIXI.Container();
	container.label = "HighwayRenderer";

	const cleanup: (() => void)[] = [];

	

	cleanup.push(effect([ctx.numLanes], (numLanes) => {
		container.removeChildren();
		const screenWidth = ctx.screenSize.get().width;
		for (let laneIdx = 0; laneIdx < numLanes; laneIdx++) {
			const lane = singleLaneRenderer({
				virtualScreenHeight: computed([ctx.screenSize], (screenSize) => screenSize.height),
				fillColor: ctx.fillColor,
				fillAlpha: ctx.fillAlpha,
			});

			// vertical line
			const lane2 = new PIXI.Graphics();
			lane2.clear();
			lane2.rect(0, 0, 1, 1000);
			lane2.fill({
				color: 0xff00ff,
			});	
				
			lane2.x = screenWidth / 2 - ((numLanes - 1) * ctx.laneSpace.get()) / 2 + (laneIdx * ctx.laneSpace.get());
			lane.x = screenWidth / 2 - ((numLanes - 1) * ctx.laneSpace.get()) / 2 + (laneIdx * ctx.laneSpace.get());
			container.addChild(lane);
			container.addChild(lane2);
		}
	}));
	return container;
}
