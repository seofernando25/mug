import { writable } from 'svelte/store';
import { browser } from '$app/environment'; // Import browser check

const LOCAL_STORAGE_KEY = 'mug_username';

// Function to get initial value from localStorage (only in browser)
function getInitialUsername(): string | null {
	if (!browser) return null; // Return null on server
	return localStorage.getItem(LOCAL_STORAGE_KEY);
}

// Create the writable store with the initial value
const store = writable<string | null>(getInitialUsername());

// Subscribe to store changes to update localStorage (only in browser)
if (browser) {
	store.subscribe(value => {
		if (value) {
			localStorage.setItem(LOCAL_STORAGE_KEY, value);
		} else {
			localStorage.removeItem(LOCAL_STORAGE_KEY);
		}
	});
}

// Logout function
function logout() {
	store.set(null); // This will trigger the subscription above to remove from localStorage
}

// Export the store and the logout function
export const username = store;
export { logout }; 