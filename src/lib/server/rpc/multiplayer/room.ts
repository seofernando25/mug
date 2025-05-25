import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { type } from 'arktype';
import { and, asc, desc, count as drizzleCount, eq, isNotNull } from 'drizzle-orm';
import { routerBaseContext } from '../context';
import { requireAuth } from '../middleware/auth';
import { eventIterator } from '@orpc/server';

// Helper function for consistent username display
const getDisplayName = (user: { name: string, displayUsername?: string | null }) => user.displayUsername ?? user.name;

// Track active SSE connections for cleanup
const activeConnections = new Map<string, { userId: string; roomId: number; lastHeartbeat: number }>();

// --- Input Schemas ---
export const CreateRoomInput = type({
	roomName: 'string>0',
	roomPassword: '(string>0)?',
	currentChartId: '(string & /^[0-9a-fA-F-]{36}$/)?', // Optional UUID for chart
});

const JoinRoomInput = type({
	roomName: 'string>0',
	roomPassword: '(string>0)?',
});


const RoomIdInput = type({
	roomId: 'number > 0',
});

const UpdateRoomInput = type({
	roomName: 'string>0', // To identify the room
	newName: '(string>0)?',
	newPassword: '(string>0)?',
	currentChartId: '(string & /^[0-9a-fA-F-]{36}$/)?', // Optional UUID for chart, can be null to unset
});



// --- Helper: Handle Player Left/Disconnect ---
async function handlePlayerLeftRoom(
	dbInstance: typeof db,
	userId: string,
	roomIdToUpdate: number
) {
	// First, check if the room still exists
	const currentRoom = await dbInstance.query.room.findFirst({
		where: eq(schema.room.id, roomIdToUpdate),
		columns: { ownerId: true, id: true, name: true }
	});

	if (!currentRoom) {
		return;
	}

	// Remove the player from the room
	try {
		const deleteResult = await dbInstance.delete(schema.roomPlayer)
			.where(and(eq(schema.roomPlayer.roomId, roomIdToUpdate), eq(schema.roomPlayer.userId, userId)))
			.returning({ deletedUserId: schema.roomPlayer.userId });
	} catch (error) {
		console.error(`Error removing player ${userId} from room ${roomIdToUpdate}:`, error);
		// Continue with cleanup even if this fails
	}

	// Check remaining players after removal
	const remainingPlayersResult = await dbInstance.select({ count: drizzleCount(schema.roomPlayer.userId) })
		.from(schema.roomPlayer)
		.where(eq(schema.roomPlayer.roomId, roomIdToUpdate))
		.execute();

	const remainingPlayersCount = remainingPlayersResult[0]?.count ?? 0;
	const wasOwner = currentRoom.ownerId === userId;

	if (remainingPlayersCount === 0) {
		// Room is empty, delete it
		try {
			await dbInstance.delete(schema.room).where(eq(schema.room.id, roomIdToUpdate));
			console.log(`Deleted empty room ${currentRoom.name} (ID: ${roomIdToUpdate})`);
		} catch (dbError) {
			console.error(`Error deleting empty room ${roomIdToUpdate}:`, dbError);
		}
	} else if (wasOwner) {
		// Owner left but room has other players, transfer ownership
		const nextPlayer = await dbInstance.query.roomPlayer.findFirst({
			where: eq(schema.roomPlayer.roomId, roomIdToUpdate),
			orderBy: [asc(schema.roomPlayer.joinedAt)],
			columns: { userId: true }
		});

		if (nextPlayer) {
			try {
				await dbInstance.update(schema.room)
					.set({ ownerId: nextPlayer.userId, lastActivityAt: new Date() })
					.where(eq(schema.room.id, roomIdToUpdate));
				console.log(`Transferred ownership of room ${currentRoom.name} to ${nextPlayer.userId}`);
			} catch (dbError) {
				console.error(`Error transferring ownership for room ${roomIdToUpdate}:`, dbError);
			}
		} else {
			// This shouldn't happen since we checked remainingPlayersCount > 0, but handle it
			try {
				await dbInstance.delete(schema.room).where(eq(schema.room.id, roomIdToUpdate));
				console.log(`Deleted room ${currentRoom.name} (fallback)`);
			} catch (dbError) {
				console.error(`Error deleting room ${roomIdToUpdate} as fallback:`, dbError);
			}
		}
	} else {
		// Non-owner left, just update activity timestamp
		try {
			await dbInstance.update(schema.room)
				.set({ lastActivityAt: new Date() })
				.where(eq(schema.room.id, roomIdToUpdate));
		} catch (dbError) {
			console.error(`Error updating lastActivityAt for room ${roomIdToUpdate}:`, dbError);
		}
	}
}

// --- ORPC Procedures ---
export const createRoomProcedure = routerBaseContext
	.use(requireAuth)
	.input(CreateRoomInput)
	.handler(async ({ input, context }) => {
		const existingRoom = await db.query.room.findFirst({ where: eq(schema.room.name, input.roomName) });
		if (existingRoom) {
			return { success: false, error: { code: 'CONFLICT', message: 'Room with this name already exists.' } };
		}

		let passwordHash: string | null = null;
		if (input.roomPassword) {
			passwordHash = await Bun.password.hash(input.roomPassword, { algorithm: "argon2id", memoryCost: 65536, timeCost: 2 });
		}

		const ownerDisplayName = getDisplayName(context.auth.user);

		try {
			const newRoomValues: typeof schema.room.$inferInsert = {
				name: input.roomName,
				passwordHash: passwordHash,
				ownerId: context.auth.user.id,
				currentChartId: input.currentChartId, // Can be undefined/null
				createdAt: new Date(),
				lastActivityAt: new Date(),
			};

			const newRoomResults = await db.insert(schema.room).values(newRoomValues)
				.returning({
					id: schema.room.id,
					name: schema.room.name,
					ownerId: schema.room.ownerId,
					currentChartId: schema.room.currentChartId,
				}).execute();

			const newRoom = newRoomResults[0];

			if (!newRoom || !newRoom.id) {
				return { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create room and get ID.' } };
			}

			await db.insert(schema.roomPlayer).values({
				roomId: newRoom.id,
				userId: context.auth.user.id,
				joinedAt: new Date(),
			}).execute();

			console.log(`Room '${newRoom.name}' created by ${ownerDisplayName} (ID: ${newRoom.id})`);
			// Fetch chart details if currentChartId is present to return them
			let chartDetails = null;
			if (newRoom.currentChartId) {
				const chartData = await db.query.chart.findFirst({
					where: eq(schema.chart.id, newRoom.currentChartId),
					with: { song: { columns: { title: true, artist: true, imageS3Key: true } } }
				});
				if (chartData && chartData.song) {
					chartDetails = {
						name: chartData.song.title,
						artist: chartData.song.artist,
						coverUrl: chartData.song.imageS3Key, // Assuming this is the direct URL or can be constructed
						difficultyName: chartData.difficultyName
					};
				}
			}

			return {
				success: true,
				room: {
					ownerUsername: ownerDisplayName,
					...newRoom,
					currentChart: chartDetails
				}
			};
		} catch (error) {
			console.error('Error creating room:', error);
			return { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not create room.' } };
		}
	});

export const joinRoomProcedure = routerBaseContext
	.use(requireAuth)
	.input(JoinRoomInput)
	.handler(async ({ input, context }) => {
		const roomToJoin = await db.query.room.findFirst({
			where: eq(schema.room.name, input.roomName),
			columns: { id: true, passwordHash: true, name: true }
		});

		if (!roomToJoin) {
			return { success: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } };
		}

		if (roomToJoin.passwordHash) {
			if (!input.roomPassword) {
				return { success: false, error: { code: 'BAD_REQUEST', message: 'Password required to join this room.' } };
			}
			const isMatch = await Bun.password.verify(input.roomPassword, roomToJoin.passwordHash);
			if (!isMatch) {
				return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid password.' } };
			}
		}

		const userDisplayName = getDisplayName(context.auth.user);
		try {
			const existingPlayer = await db.query.roomPlayer.findFirst({
				where: and(eq(schema.roomPlayer.roomId, roomToJoin.id), eq(schema.roomPlayer.userId, context.auth.user.id))
			});

			if (!existingPlayer) {
				await db.insert(schema.roomPlayer).values({
					roomId: roomToJoin.id,
					userId: context.auth.user.id,
					joinedAt: new Date(),
				}).execute();
			}

			await db.update(schema.room)
				.set({ lastActivityAt: new Date() })
				.where(eq(schema.room.id, roomToJoin.id))
				.execute();

			console.log(`User ${userDisplayName} joined room '${roomToJoin.name}' (ID: ${roomToJoin.id})`);
			return {
				success: true,
				room: {
					id: roomToJoin.id,
					name: roomToJoin.name,
				}
			};
		} catch (error) {
			console.error(`Error joining room ${roomToJoin.id}:`, error);
			return { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not join room.' } };
		}
	});

export const leaveRoomProcedure = routerBaseContext
	.use(requireAuth)
	.input(RoomIdInput)
	.handler(async ({ input, context }) => {
		const roomToLeave = await db.query.room.findFirst({
			where: eq(schema.room.id, input.roomId),
			columns: { id: true, name: true }
		});
		if (!roomToLeave) {
			return { success: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } };
		}

		await handlePlayerLeftRoom(db, context.auth.user.id, input.roomId);
		console.log(`User ${getDisplayName(context.auth.user)} explicitly left room '${roomToLeave.name}' (ID: ${input.roomId})`);
		return { success: true, message: 'Successfully left room.' };
	});

export const listRoomsProcedure = routerBaseContext
	.handler(async ({ context }) => {
		try {
			const roomsData = await db.select({
				id: schema.room.id,
				name: schema.room.name,
				ownerId: schema.room.ownerId,
				ownerName: schema.user.name,
				ownerDisplayUsername: schema.user.displayUsername,
				ownerAvatar: schema.user.image,
				createdAt: schema.room.createdAt,
				lastActivityAt: schema.room.lastActivityAt,
				playerCount: drizzleCount(schema.roomPlayer.userId),
				isPasswordProtected: isNotNull(schema.room.passwordHash),
				currentChartId: schema.room.currentChartId,
				// Fields from joined chart and song tables
				chartDifficultyName: schema.chart.difficultyName,
				songTitle: schema.song.title,
				songArtist: schema.song.artist,
				songImageS3Key: schema.song.imageS3Key,
			})
				.from(schema.room)
				.leftJoin(schema.roomPlayer, eq(schema.room.id, schema.roomPlayer.roomId))
				.leftJoin(schema.user, eq(schema.room.ownerId, schema.user.id))
				.leftJoin(schema.chart, eq(schema.room.currentChartId, schema.chart.id)) // Join with chart
				.leftJoin(schema.song, eq(schema.chart.songId, schema.song.id)) // Join with song
				.groupBy(
					schema.room.id,
					schema.room.name,
					schema.room.ownerId,
					schema.user.name,
					schema.user.displayUsername,
					schema.user.image,
					schema.room.createdAt,
					schema.room.lastActivityAt,
					schema.room.passwordHash,
					schema.room.currentChartId,
					schema.chart.difficultyName,
					schema.song.title,
					schema.song.artist,
					schema.song.imageS3Key
				)
				.orderBy(desc(schema.room.lastActivityAt))
				.execute();

			return {
				success: true,
				rooms: roomsData.map((r) => ({
					id: r.id,
					name: r.name,
					owner: {
						id: r.ownerId,
						name: getDisplayName({ name: r.ownerName ?? 'Unknown Owner', displayUsername: r.ownerDisplayUsername }),
						avatarUrl: r.ownerAvatar,
					},
					playerCount: Number(r.playerCount),
					createdAt: r.createdAt,
					lastActivityAt: r.lastActivityAt,
					isPasswordProtected: r.isPasswordProtected,
					currentChart: r.currentChartId ? {
						id: r.currentChartId,
						name: r.songTitle,       // from joined song table
						artist: r.songArtist,     // from joined song table
						coverUrl: r.songImageS3Key, // from joined song table
						difficultyName: r.chartDifficultyName // from joined chart table
					} : null,
				}))
			};
		} catch (error) {
			console.error('Error listing rooms:', error);
			return { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not list rooms.' } };
		}
	});

export const getRoomProcedure = routerBaseContext
	.use(requireAuth)
	.input(RoomIdInput)
	.handler(async ({ input, context }) => {
		const roomData = await db.query.room.findFirst({
			where: eq(schema.room.id, input.roomId),
			columns: {
				id: true,
				name: true,
				createdAt: true,
				lastActivityAt: true,
				ownerId: true
			},
			with: {
				currentChart: {
					columns: {
						difficultyName: true,
						id: true,
						songId: true
					},
					with: {
						song: {
							columns: {
								imageS3Key: true,
								artist: true,
								title: true
							}
						}
					}
				},
				players: {
					columns: {
						userId: true,
						joinedAt: true
					},
					with: {
						user: {
							columns: {
								id: true,
								name: true,
								displayUsername: true,
								image: true
							}
						}
					}
				}
			}
		});

		if (!roomData) {
			return { success: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } };
		}

		const playersInRoom = Array.isArray(roomData.players) ? roomData.players : [];

		let chartDetails = null;
		if (roomData.currentChart && roomData.currentChart.song) {
			chartDetails = {
				id: roomData.currentChart.id,
				name: roomData.currentChart.song.title,
				artist: roomData.currentChart.song.artist,
				coverUrl: roomData.currentChart.song.imageS3Key,
				difficultyName: roomData.currentChart.difficultyName
			};
		}

		return {
			success: true,
			room: {
				id: roomData.id,
				name: roomData.name,
				owner: {
					id: roomData.ownerId,
					name: 'Unknown Owner',
					avatarUrl: null
				},
				players: playersInRoom.map((p) => ({
					userId: p.user.id,
					username: getDisplayName(p.user),
					joinedAt: p.joinedAt,
					avatarUrl: p.user?.image
				})),
				createdAt: roomData.createdAt,
				lastActivityAt: roomData.lastActivityAt,
				currentChart: chartDetails,
			}
		};
	});

export const deleteRoomProcedure = routerBaseContext
	.use(requireAuth)
	.input(RoomIdInput)
	.handler(async ({ input, context }) => {
		const roomToDelete = await db.query.room.findFirst({
			where: eq(schema.room.id, input.roomId),
			columns: { ownerId: true, id: true, name: true }
		});

		if (!roomToDelete) {
			return { success: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } };
		}

		if (roomToDelete.ownerId !== context.auth.user.id) {
			return { success: false, error: { code: 'FORBIDDEN', message: 'You are not the owner of this room.' } };
		}

		try {
			await db.delete(schema.room).where(eq(schema.room.id, input.roomId)).execute();
			console.log(`Room '${roomToDelete.name}' (ID: ${input.roomId}) deleted by owner ${getDisplayName(context.auth.user)}.`);
			return { success: true, message: 'Room deleted successfully.' };
		} catch (error) {
			console.error(`Error deleting room ${input.roomId}:`, error);
			return { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not delete room.' } };
		}
	});

export const updateRoomProcedure = routerBaseContext
	.use(requireAuth)
	.input(UpdateRoomInput)
	.handler(async ({ input, context }) => {
		const roomToUpdate = await db.query.room.findFirst({
			where: eq(schema.room.name, input.roomName),
			columns: { id: true, ownerId: true }
		});

		if (!roomToUpdate) {
			return { success: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } };
		}

		if (roomToUpdate.ownerId !== context.auth.user.id) {
			return { success: false, error: { code: 'FORBIDDEN', message: 'You are not the owner of this room.' } };
		}

		const updates: Partial<typeof schema.room.$inferInsert> = { lastActivityAt: new Date() };

		if (input.newName) {
			if (input.newName !== input.roomName) {
				const existingRoomWithNewName = await db.query.room.findFirst({ where: eq(schema.room.name, input.newName) });
				if (existingRoomWithNewName) {
					return { success: false, error: { code: 'CONFLICT', message: 'A room with the new name already exists.' } };
				}
			}
			updates.name = input.newName;
		}
		if (input.newPassword) {
			updates.passwordHash = await Bun.password.hash(input.newPassword, { algorithm: "argon2id", memoryCost: 65536, timeCost: 2 });
		} else if (input.newPassword === '') {
			updates.passwordHash = null;
		}

		if (input.currentChartId !== undefined) {
			updates.currentChartId = input.currentChartId; // Allow setting to null explicitly
		}

		try {
			await db.update(schema.room).set(updates).where(eq(schema.room.id, roomToUpdate.id)).execute();
			console.log(`Room (ID: ${roomToUpdate.id}) updated by owner ${getDisplayName(context.auth.user)}.`);
			return { success: true, message: 'Room updated successfully.' };
		} catch (error) {
			console.error(`Error updating room ${roomToUpdate.id}:`, error);
			return { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not update room.' } };
		}
	});


// --- SSE Procedure for Room Events & Disconnect Handling ---
export const subscribeToRoomEvents = routerBaseContext
	.use(requireAuth)
	.input(RoomIdInput)
	.handler(async function* ({ input, context, signal }) {
		const userId = context.auth.user.id;
		const roomId = input.roomId;
		const userDisplayName = getDisplayName(context.auth.user);

		let playerEntry = await db.query.roomPlayer.findFirst({
			where: and(eq(schema.roomPlayer.roomId, roomId), eq(schema.roomPlayer.userId, userId))
		});

		if (!playerEntry) {
			yield { success: false, message: 'Not a member of this room or room does not exist.' };
			return;
		}

		console.log(`User ${userDisplayName} connected to room ${roomId}`);
		yield { success: true, type: 'CONNECTION_ESTABLISHED', message: `Subscribed to room ${roomId}` };

		// Track connection for cleanup
		const connectionId = `${userId}-${roomId}`;
		const connectionInfo = { userId, roomId, lastHeartbeat: Date.now() };
		activeConnections.set(connectionId, connectionInfo);
		console.log(`Tracking connection ${connectionId} (total active: ${activeConnections.size})`);

		try {
			while (true) {
				// Update heartbeat for cleanup tracking
				const connection = activeConnections.get(connectionId);
				if (connection) {
					connection.lastHeartbeat = Date.now();
				}

				// Check if client wants to abort
				signal?.throwIfAborted();

				// Wait before next iteration
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		} catch (error) {
			// This will catch AbortError when signal is aborted
			console.log(`Connection aborted for user ${userDisplayName} in room ${roomId}`);
		} finally {
			console.log(`User ${userDisplayName} disconnected from room ${roomId}`);

			// Remove from active connections
			const connectionId = `${userId}-${roomId}`;
			activeConnections.delete(connectionId);

			// Clean up the room
			try {
				await handlePlayerLeftRoom(db, userId, roomId);
			} catch (cleanupError) {
				console.error(`Cleanup error for user ${userId} in room ${roomId}:`, cleanupError);
			}
		}
	});

// Background cleanup for stale connections
setInterval(async () => {
	const now = Date.now();
	const staleThreshold = 5000; // 5 seconds
	const staleConnections = [];

	for (const [connectionId, connection] of activeConnections.entries()) {
		if (now - connection.lastHeartbeat > staleThreshold) {
			staleConnections.push({ connectionId, connection });
		}
	}

	if (staleConnections.length > 0) {
		console.log(`Found ${staleConnections.length} stale connections to clean up`);

		for (const { connectionId, connection } of staleConnections) {
			console.log(`Cleaning up stale connection: User ${connection.userId} in room ${connection.roomId} (last heartbeat: ${new Date(connection.lastHeartbeat).toISOString()})`);
			activeConnections.delete(connectionId);

			try {
				await handlePlayerLeftRoom(db, connection.userId, connection.roomId);
				console.log(`Successfully cleaned up stale connection for user ${connection.userId} in room ${connection.roomId}`);
			} catch (error) {
				console.error(`Error cleaning up stale connection ${connectionId}:`, error);
			}
		}
	}
}, 5000); // Check every 5 seconds


