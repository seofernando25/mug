// src/routes/api/song/[songId]/+server.ts
import db from '$lib/server/db'; // Your Drizzle DB instance
import { chartHitObject, song } from '$lib/server/db/music-schema.js'; // Your Drizzle schema tables
import s3 from '$lib/server/s3'; // Your S3 client instance (Bun's S3Client)
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm'; // Drizzle's equality comparator



export async function GET({ params }) {
	const songId = params.songId;

	if (!songId) {
		throw error(400, { message: 'Song ID is required.' });
	}

	try {
		// Query the database to get the song and all its related charts and hit objects
		const songData = await db.query.song.findFirst({
			where: eq(song.id, songId),
			with: {
				charts: {
					with: {
						hitObjects: {
							// Optionally order hit objects by time for consistency
							orderBy: chartHitObject.time,
						},
					},
					// Optionally order charts by difficulty name or id if you have an order field
					// orderBy: chart.difficultyName,
				},
			},
		});

		if (!songData) {
			throw error(404, { message: 'Song not found.' });
		}

		// Generate S3 URLs
		// The expiry time for presigned URLs should be long enough for a user to play the song.
		// Consider making this configurable. 1 hour = 3600 seconds. Maybe longer for gameplay.
		const urlExpirySeconds = 60 * 60 * 24; // 24 hours expiry for gameplay assets

		const audioUrl = await s3.file(songData.audioS3Key).presign({
			expiresIn: urlExpirySeconds,
			// You might set ACL to public-read if the assets are meant to be public anyway
			// acl: 'public-read',
		});

		let imageUrl: string | null = null;
		if (songData.imageS3Key) {
			try {
				imageUrl = await s3.file(songData.imageS3Key).presign({
					expiresIn: urlExpirySeconds,
					// acl: 'public-read',
				});
			} catch (imgErr) {
				console.warn(`Failed to presign image URL for key ${songData.imageS3Key}:`, imgErr);
				// Continue without image if presigning fails
				imageUrl = null;
			}
		}

		// Structure the response payload
		const responsePayload = {
			id: songData.id,
			title: songData.title,
			artist: songData.artist,
			bpm: songData.bpm, // Initial BPM
			previewStartTime: songData.previewStartTime,
			audioUrl: audioUrl, // S3 presigned URL
			imageUrl: imageUrl, // S3 presigned URL or null
			uploadDate: songData.uploadDate, // Might be useful metadata on client

			charts: songData.charts.map(c => ({
				id: c.id, // Chart UUID
				difficultyName: c.difficultyName,
				lanes: c.lanes,
				noteScrollSpeed: c.noteScrollSpeed,
				lyrics: c.lyrics, // JSONB lyrics
				// Hit objects are embedded directly in the chart object for client consumption
				hitObjects: c.hitObjects.map(ho => ({
					time: ho.time,
					lane: ho.lane,
					type: ho.type,
					duration: ho.duration,
				})),
			})),
		};

		return json(responsePayload);

	} catch (e: any) {
		console.error(`Error fetching song ${songId} from DB/S3:`, e);
		// If it's already an HTTP error, rethrow it
		if (e.status) {
			throw e;
		}
		// Otherwise, return a generic 500 error
		throw error(500, { message: 'Internal server error fetching song data.' });
	}
}
