import { browser } from "$app/environment";
import { writable } from "svelte/store";

// Helper function to create a persistent store
export function createPersistentStore<T>(key: string, startValue: T) {
	let initialValue = startValue;

	if (browser) {
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

	if (browser) {
		store.subscribe(current => {
			localStorage.setItem(key, JSON.stringify(current));
		});
	}

	return store;
}