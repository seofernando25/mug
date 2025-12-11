import { assertClientPacket, ErrorCode } from '@mug/contract';
import { validateSession, getRedis } from '@mug/db';
import { RoomManager, type PlayerData } from './state';
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
		open(ws) {
			console.log(`User connected: ${ws.data.user.id}`);
			connections.add(ws);
			ws.send(JSON.stringify({ op: 'ack', data: { message: 'connected' } }));
			ws.send(JSON.stringify({ op: 'room_list', data: roomManager.getLobbyList() }));
		},
		message(ws, msg) {
			console.log('[bancho] received message from', ws.data?.user, 'message', msg);
			try {
				const parsed = typeof msg === 'string' ? JSON.parse(msg) : JSON.parse(msg.toString());
				assertClientPacket(parsed);

				switch (parsed.op) {
					case 'ping':
						ws.send(JSON.stringify({ op: 'pong', data: { message: 'pong' } }));
						break;
					case 'noop':
						break;
					case 'create_room': {
						if (ws.data.roomId) roomManager.leaveRoom(ws);
						const name = ((parsed as any).data?.name ?? '').toString().trim() || 'Room';
						const room = roomManager.createRoom(ws, name);
						ws.send(JSON.stringify({ op: 'ack', data: { message: 'room_created', roomId: room.id, name: room.name } }));
						// Send updated lobby list to all
						const lobby = roomManager.getLobbyList();
						for (const client of connections) {
							if (client.readyState === 1) client.send(JSON.stringify({ op: 'room_list', data: lobby }));
						}
						// Send room_state to members
						const state = roomManager.getRoomState(room.id);
						if (state) roomManager.broadcastToRoom(room.id, { op: 'room_state', data: state });
						break;
					}
					case 'join_room': {
						const roomId = (parsed as any).data?.roomId;
						if (!roomId) {
							ws.send(JSON.stringify({ op: 'error', data: { code: ErrorCode.BAD_REQUEST, message: 'roomId required' } }));
							break;
						}
						try {
							if (ws.data.roomId && ws.data.roomId !== roomId) roomManager.leaveRoom(ws);
							roomManager.joinRoom(ws, roomId);
							ws.send(JSON.stringify({ op: 'ack', data: { message: 'room_joined', roomId } }));
							const state = roomManager.getRoomState(roomId);
							if (state) roomManager.broadcastToRoom(roomId, { op: 'room_state', data: state });
						} catch (err: any) {
							ws.send(JSON.stringify({ op: 'error', data: { code: ErrorCode.NOT_FOUND, message: err?.message ?? 'join failed' } }));
						}
						break;
					}
					case 'leave_room': {
						roomManager.leaveRoom(ws);
						ws.send(JSON.stringify({ op: 'ack', data: { message: 'left_room' } }));
						const lobby = roomManager.getLobbyList();
						for (const client of connections) {
							if (client.readyState === 1) client.send(JSON.stringify({ op: 'room_list', data: lobby }));
						}
						break;
					}
					case 'get_room_state': {
						const roomId = (parsed as any).data?.roomId;
						if (roomId && typeof roomId === 'string') {
							const state = roomManager.getRoomState(roomId);
							if (state) ws.send(JSON.stringify({ op: 'room_state', data: state }));
							else ws.send(JSON.stringify({ op: 'error', data: { code: ErrorCode.NOT_FOUND, message: 'room not found' } }));
						}
						break;
					}
					case 'score_update': {
						// Validate incoming client score payload before broadcasting
						const payload = (parsed as any).data;
						if (!payload || typeof payload.score !== 'number' || Number.isNaN(payload.score)) {
							ws.send(JSON.stringify({ op: 'error', data: { code: ErrorCode.BAD_REQUEST, message: 'invalid score_update payload' } }));
							break;
						}
						// Inject authoritative identity to avoid missing userId/username downstream
						const normalizedPayload = {
							...payload,
							userId: ws.data?.user?.id,
							username: ws.data?.user?.username
						};
						console.log('[bancho] received score_update from', ws.data?.user, 'payload', normalizedPayload);
						roomManager.broadcastScore(ws, normalizedPayload);
						break;
					}
					case 'match_finished': {
						const payload = (parsed as any).data;
						const normalizedPayload = {
							...(payload ?? {}),
							userId: ws.data?.user?.id,
							username: ws.data?.user?.username
						};
						console.log('[bancho] received match_finished from', ws.data?.user, 'payload', normalizedPayload);
						roomManager.broadcastMatchFinish(ws, normalizedPayload);
						break;
					}
					default:
						ws.send(JSON.stringify({ op: 'error', data: { code: ErrorCode.BAD_REQUEST, message: 'unsupported op' } }));
						break;
				}
			} catch (err) {
				console.error('Packet error', err);
				ws.send(JSON.stringify({ op: 'error', data: { code: ErrorCode.BAD_REQUEST, message: 'invalid packet' } }));
			}
		},
		close(ws) {
			connections.delete(ws);
			roomManager.leaveRoom(ws);
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

