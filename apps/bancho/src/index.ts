import { ClientPacketSchema, ErrorCode } from '@mug/contract';
import { validateSession, getRedis } from '@mug/db';
import { RoomManager, type PlayerData } from './state';
import { TypedSocket } from './socket-helper';
import { type } from 'arktype';
import type { ServerWebSocket } from 'bun';

const SHUTDOWN_TIMEOUT_MS = 5_000;
const MAX_DB_CONNECTIONS = Number(process.env.BANCHO_DB_POOL_MAX ?? 2);
const shuttingDown = { value: false };

void MAX_DB_CONNECTIONS;

const redis = getRedis();
const connections = new Set<ServerWebSocket<PlayerData>>();
const roomManager = new RoomManager((event) => {
	redis.publish('global-lobby', JSON.stringify(event));
	// Broadcast lobby events to all connected clients
	const packet = JSON.stringify({ op: 'room_event', data: event });
	for (const client of connections) {
		if (client.readyState === 1) client.send(packet);
	}
});

const server = Bun.serve<PlayerData>({
	// Default to 3001 to match PUBLIC_WS_URL in the web app
	port: Number(process.env.BANCHO_PORT ?? 3001),
	async fetch(req, srv) {
		console.log('[bancho] received fetch request');
		if (shuttingDown.value) {
			return new Response('Shutting down', { status: 503 });
		}

		if (req.headers.get('upgrade') !== 'websocket') {
			return new Response('Bancho WS only', { status: 400 });
		}

		const cookies = req.headers.get('cookie') ?? '';
		// better-auth sets cookie name "better-auth.session_token"
		const rawCookie = parseCookie(cookies).get('better-auth.session_token');
		if (!rawCookie) {
			return new Response('Unauthorized', { status: 401 });
		}

		// better-auth cookie format: "<token>.<signature>"
		const decoded = decodeURIComponent(rawCookie);
		const presentedToken = decoded.split('.')[0] ?? decoded;

		const session = await validateSession(presentedToken);
		if (!session) {
			return new Response('Invalid session', { status: 403 });
		}

		const success = srv.upgrade(req, {
			data: {
				user: { id: session.user.id, username: session.user.username ?? session.user.name },
			}
		});

		return success ? undefined : new Response('Upgrade failed', { status: 400 });
	},
	websocket: {
		open(rawWs) {
			console.log(`User connected: ${rawWs.data.user.id}`);
			connections.add(rawWs);

			// Wrap the raw socket
			const socket = new TypedSocket(rawWs);

			socket.send('ack', { message: 'connected' });
			socket.send('room_list', roomManager.getLobbyList());
		},
		message(rawWs, msg) {
			const socket = new TypedSocket(rawWs);
			console.log('[bancho] received message from', socket.data?.user, 'message', msg);
			try {
				// 1. Parse JSON
				const rawJson = typeof msg === 'string' ? JSON.parse(msg) : JSON.parse(msg.toString());

				// 2. Validate with ArkType
				const result = ClientPacketSchema(rawJson);

				if (result instanceof type.errors) {
					console.error('Validation failed:', result.summary);
					socket.send('error', { code: 'BAD_REQUEST', message: result.summary });
					return;
				}

				// 3. Result is now typed as the discriminated union
				const packet = result;

				// 4. Handle Types safely
				switch (packet.op) {
					case 'ping':
						socket.send('pong', {
							message: 'pong',
							serverTime: Date.now(),
							t1: packet.data?.t1
						});
						break;
					case 'noop':
						break;
					case 'create_room': {
						if (socket.data.roomId) roomManager.leaveRoom(rawWs);
						const name = packet.data?.name ?? 'Room';
						const room = roomManager.createRoom(rawWs, name);
						socket.send('ack', { message: 'room_created' });

						// Send updated lobby list to all
						const lobby = roomManager.getLobbyList();
						for (const client of connections) {
							if (client.readyState === 1) {
								const clientSocket = new TypedSocket(client);
								clientSocket.send('room_list', lobby);
							}
						}

						// Send room_state to members
						const state = roomManager.getRoomState(room.id);
						if (state) roomManager.broadcastToRoom(room.id, { op: 'room_state', data: state });
						break;
					}
					case 'join_room': {
						const roomId = packet.data.roomId; // ArkType guarantees this exists
						try {
							if (socket.data.roomId && socket.data.roomId !== roomId) roomManager.leaveRoom(rawWs);
							roomManager.joinRoom(rawWs, roomId);
							socket.send('ack', { message: 'room_joined' });
							const state = roomManager.getRoomState(roomId);
							if (state) roomManager.broadcastToRoom(roomId, { op: 'room_state', data: state });
						} catch (err: any) {
							socket.send('error', { code: 'NOT_FOUND', message: err?.message ?? 'join failed' });
						}
						break;
					}
					case 'leave_room': {
						roomManager.leaveRoom(rawWs);
						socket.send('ack', { message: 'left_room' });
						const lobby = roomManager.getLobbyList();
						for (const client of connections) {
							if (client.readyState === 1) {
								const clientSocket = new TypedSocket(client);
								clientSocket.send('room_list', lobby);
							}
						}
						break;
					}
					case 'get_room_state': {
						const roomId = packet.data.roomId; // ArkType guarantees this exists
						const state = roomManager.getRoomState(roomId);
						if (state) socket.send('room_state', state);
						else socket.send('error', { code: 'NOT_FOUND', message: 'room not found' });
						break;
					}
					case 'score_update': {
						// Inject authoritative identity to avoid missing userId/username downstream
						const normalizedPayload = {
							...packet.data,
							userId: socket.data?.user?.id,
							username: socket.data?.user?.username
						};
						console.log('[bancho] received score_update from', socket.data?.user, 'payload', normalizedPayload);
						roomManager.broadcastScore(rawWs, normalizedPayload);
						break;
					}
					case 'match_finished': {
						const normalizedPayload = {
							...(packet.data ?? {}),
							userId: socket.data?.user?.id,
							username: socket.data?.user?.username
						};
						console.log('[bancho] received match_finished from', socket.data?.user, 'payload', normalizedPayload);
						roomManager.broadcastMatchFinish(rawWs, normalizedPayload);
						break;
					}
					case 'update_room': {
						const { roomId, currentChart } = packet.data; // ArkType guarantees these exist

						// Validate that the sender is the host
						const room = roomManager.getRoomById(roomId);
						if (!room || room.hostId !== socket.data?.user?.id) {
							socket.send('error', { code: 'BAD_REQUEST', message: 'only host can update room' });
							break;
						}

						// Update the room's current chart
						room.currentChart = currentChart;
						console.log('[bancho] updated room', roomId, 'chart to:', currentChart.name);

						// Broadcast the updated room state to all clients
						const state = roomManager.getRoomState(roomId);
						if (state) {
							roomManager.broadcastToRoom(roomId, { op: 'room_state', data: state });
						}

						socket.send('ack', { message: 'room_updated' });
						break;
					}
					case 'start_match': {
						const roomId = packet.data.roomId; // ArkType guarantees this exists

						// Validate that the sender is the host
						const room = roomManager.getRoomById(roomId);
						if (!room || room.hostId !== socket.data?.user?.id) {
							socket.send('error', { code: 'BAD_REQUEST', message: 'only host can start match' });
							break;
						}

						// Calculate target start time (3 seconds from now)
						const startTime = Date.now() + 3000;

						// Update room status and start time
						room.status = 'starting';
						room.startTime = startTime;

						console.log('[bancho] starting match in room', roomId, 'at', new Date(startTime).toISOString());

						// Broadcast the starting state to all clients
						const state = roomManager.getRoomState(roomId);
						if (state) {
							roomManager.broadcastToRoom(roomId, { op: 'room_state', data: state });
						}

						// Schedule automatic transition to 'playing' after 3 seconds
						setTimeout(() => {
							room.status = 'playing';
							const finalState = roomManager.getRoomState(roomId);
							if (finalState) {
								roomManager.broadcastToRoom(roomId, { op: 'room_state', data: finalState });
							}
						}, 3000);

						socket.send('ack', { message: 'match_starting' });
						break;
					}
					case 'start_match': {
						const roomId = packet.data.roomId; // ArkType guarantees this exists

						// Validate that the sender is the host
						const room = roomManager.getRoomById(roomId);
						if (!room || room.hostId !== socket.data?.user?.id) {
							socket.send('error', { code: 'BAD_REQUEST', message: 'only host can start match' });
							break;
						}

						// Calculate target start time (3 seconds from now)
						const startTime = Date.now() + 3000;

						// Update room status and start time
						room.status = 'starting';
						room.startTime = startTime;

						console.log('[bancho] starting match in room', roomId, 'at', new Date(startTime).toISOString());

						// Broadcast the starting state to all clients
						const state = roomManager.getRoomState(roomId);
						if (state) {
							roomManager.broadcastToRoom(roomId, { op: 'room_state', data: state });
						}

						// Schedule automatic transition to 'playing' after 3 seconds
						setTimeout(() => {
							room.status = 'playing';
							const finalState = roomManager.getRoomState(roomId);
							if (finalState) {
								roomManager.broadcastToRoom(roomId, { op: 'room_state', data: finalState });
							}
						}, 3000);

						socket.send('ack', { message: 'match_starting' });
						break;
					}
					default:
						socket.send('error', { code: 'BAD_REQUEST', message: 'unsupported op' });
						break;
				}
			} catch (err) {
				console.error('Packet error', err);
				socket.send('error', { code: 'BAD_REQUEST', message: 'invalid packet' });
			}
		},
		close(ws) {
			connections.delete(ws);
			roomManager.handleDisconnect(ws);
			const lobby = roomManager.getLobbyList();
			for (const client of connections) {
				if (client.readyState === 1) client.send(JSON.stringify({ op: 'room_list', data: lobby }));
			}
		}
	}
});

console.log(`🏆 Bancho WS server running on port ${server.port}`);

process.on('SIGTERM', () => {
	shuttingDown.value = true;
	server.stop(true);
	setTimeout(() => process.exit(0), SHUTDOWN_TIMEOUT_MS).unref();
});

function parseCookie(cookieHeader: string): Map<string, string> {
	const map = new Map<string, string>();
	cookieHeader.split(';').forEach((part) => {
		const [k, v] = part.split('=').map(s => s?.trim());
		if (k) map.set(k, v ?? '');
	});
	return map;
}

