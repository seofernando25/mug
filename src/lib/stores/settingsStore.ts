import { writable } from 'svelte/store';

export const isOptionsMenuOpen = writable(false);
export const masterVolume = writable(1); // Default volume: 100%
export const musicVolume = writable(1); // Default music volume: 100%
export const isPaused = writable(false);

// Sync isPaused with isOptionsMenuOpen
isOptionsMenuOpen.subscribe(isOpen => {
  isPaused.set(isOpen);
}); 