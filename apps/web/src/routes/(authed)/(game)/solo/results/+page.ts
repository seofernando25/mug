import type { PageLoad } from './$types';

// This page receives results data via navigation state, not via server-side loading
export const ssr = false;

export const load: PageLoad = async () => {
	// For now, just return empty - results will come from client navigation state
	// In a real implementation, this might load from a database if storing results server-side
	return {};
};