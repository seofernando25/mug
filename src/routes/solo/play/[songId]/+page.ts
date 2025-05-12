import type { Load } from '@sveltejs/kit';

export const load: Load = ({ params }) => {
	// TODO: Fetch actual song data based on songId here
	// For now, just pass the ID
	return {
		songId: params.songId
	};
}; 