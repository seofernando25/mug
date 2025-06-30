import * as PIXISound from '@pixi/sound';
import { atom, effect, type Atom } from 'nanostores';

export const urlSoundFactory = (ctx: {
	url: Atom<string | undefined>,
}) => {
	const sound = atom<PIXISound.Sound | undefined>(undefined);

	const isLoaded = atom<boolean>(false);

	const urlChangeEffect = effect(ctx.url, (url) => {
		isLoaded.set(false);
		if (!url) return;
		sound.set(
			PIXISound.Sound.from({
				preload: true,
				url: url,
				loaded: (err) => {
					if (err === null) {
						isLoaded.set(true);
					} else {
						console.error("Failed to load sound", err);
					}
				},
			}
	));

	});


	return {
		sound,
		isLoaded,
		cleanup: () => {
			urlChangeEffect();
			sound.get()?.destroy();
			sound.set(undefined);
		}
	}

}