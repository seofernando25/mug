import { createPersistentStore } from '$lib/persistentStore';

export const masterVolume = createPersistentStore('masterVolume', 0.75);
export const musicVolume = createPersistentStore('musicVolume', 0.75);


// Added settings
export const skipLogin = createPersistentStore('skipLogin', false);
export const autoPlay = createPersistentStore('autoPlay', false);
export const enableScreenPulse = createPersistentStore('enableScreenPulse', true);

