import { quintOut } from 'svelte/easing';


export function stretchIn(
	node: HTMLElement,
	{ delay = 0, duration = 300, easing = quintOut, startScaleX = 3.0, startScaleY = 0.8 }
) {
	const style = getComputedStyle(node);
	const original_transform = style.transform === 'none' ? '' : style.transform;

	return {
		delay,
		duration,
		easing,
		css: (t: number, u: number) => {
			const currentScaleX = u * startScaleX + t * 1.0;
			const currentScaleY = u * startScaleY + t * 1.0;
			const currentOpacity = t;

			return `
				transform: ${original_transform} scaleX(${currentScaleX}) scaleY(${currentScaleY});
				transform-origin: center center;
				opacity: ${currentOpacity};
			`;
		}
	};
}