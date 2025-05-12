import type { Load } from '@sveltejs/kit';

// Disable SSR for this page
export const ssr = false;

export const load: Load = ({ params }) => {
	// TODO: Fetch actual song data based on songId here
	// For now, just pass the ID
	return {
		songId: params.songId
	};
}; 