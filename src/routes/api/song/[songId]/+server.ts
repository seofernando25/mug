// src/routes/api/song/[songId]/+server.ts
import db from '$lib/server/db'; // Your Drizzle DB instance
import { chartHitObject, song } from '$lib/server/db/music-schema.js'; // Your Drizzle schema tables
import s3Client from '$lib/server/s3'; // Your S3 client instance (Bun's S3Client)
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm'; // Drizzle's equality comparator
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const songId = params.songId;

	if (!songId) {
		throw error(400, { message: 'Song ID is required.' });
	}

	try {
		// Query the database to get the song and all its related charts and hit objects
		const songDataFromDb = await db.query.song.findFirst({
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

		if (!songDataFromDb) {
			throw error(404, { message: 'Song not found.' });
		}

		// Generate S3 URLs
		// The expiry time for presigned URLs should be long enough for a user to play the song.
		// Consider making this configurable. 1 hour = 3600 seconds. Maybe longer for gameplay.
		const urlExpirySeconds = 60 * 60 * 24; // 24 hours expiry for gameplay assets

		const audioUrl = await s3Client.file(songDataFromDb.audioS3Key).presign({
			expiresIn: urlExpirySeconds,
			// You might set ACL to public-read if the assets are meant to be public anyway
			// acl: 'public-read',
		});

		let imageUrl: string | undefined = undefined;
		if (songDataFromDb.imageS3Key) {
			try {
				imageUrl = await s3Client.file(songDataFromDb.imageS3Key).presign({
					expiresIn: urlExpirySeconds,
					// acl: 'public-read',
				});
			} catch (imgErr) {
				console.warn(`Failed to presign image URL for key ${songDataFromDb.imageS3Key}:`, imgErr);
				// Continue without image if presigning fails
				imageUrl = undefined;
			}
		}

		// Map DB charts to ClientChart structure
		const clientCharts = songDataFromDb.charts.map(c => ({
			id: c.id,
			difficultyName: c.difficultyName,
			lanes: c.lanes,
			noteScrollSpeed: c.noteScrollSpeed,
			// TODO: Add lyrics to the response
			lyrics: null,
			hitObjects: c.hitObjects.map(ho => ({
				time: ho.time,
				lane: ho.lane,
				type: ho.note_type,
				duration: ho.duration,
			})),
		}));

		// Structure the response payload
		const responsePayload = {
			...songDataFromDb, // Spread all properties from the base song query
			audioS3Key: songDataFromDb.audioS3Key, // Ensure all Song properties are present
			imageS3Key: songDataFromDb.imageS3Key, // Can be null
			uploaderId: songDataFromDb.uploaderId,
			audioFilename: songDataFromDb.audioFilename,
			// Overwrite/add specific fields for SongDetail
			audioUrl: audioUrl,
			imageUrl: imageUrl,
			charts: clientCharts,
			// Ensure uploadDate is a string if SongDetail expects string, or Date if it expects Date.
			// Drizzle timestamp typically returns Date objects, so if SongDetail.uploadDate is string, conversion is needed.
			// For now, assuming Song.uploadDate (from $inferSelect) is Date and SongDetail also expects Date.
			// uploadDate: songDataFromDb.uploadDate.toISOString(), // Example if string is needed
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
};
