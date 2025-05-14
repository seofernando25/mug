import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Helper function to create a persistent store
function createPersistentStore<T>(key: string, startValue: T) {
    const isBrowser = browser; // Capture browser value at the time of store creation
    let initialValue = startValue;

    if (isBrowser) {
        const storedValue = localStorage.getItem(key);
        if (storedValue !== null) {
            try {
                initialValue = JSON.parse(storedValue) as T;
            } catch (e) {
                console.error(`Failed to parse stored value for ${key}:`, e);
                localStorage.removeItem(key); // Remove corrupted item
                initialValue = startValue;
            }
        }
    }

    const store = writable<T>(initialValue);

    if (isBrowser) {
        store.subscribe(current => {
            localStorage.setItem(key, JSON.stringify(current));
        });
    }

    return store;
}

// export const isOptionsMenuOpen = writable(false); // Removed
export const masterVolume = createPersistentStore('masterVolume', 0.75);
export const musicVolume = createPersistentStore('musicVolume', 0.75);
export const isPaused = writable(false);

// Added settings
export const skipLogin = createPersistentStore('skipLogin', false);
export const autoPlay = createPersistentStore('autoPlay', false);

// Sync isPaused with isOptionsMenuOpen - REMOVED
// isOptionsMenuOpen.subscribe(isOpen => {
//  isPaused.set(isOpen);
// }); 