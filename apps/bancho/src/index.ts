import { assertClientPacket, ErrorCode } from '@mug/contract';
import { validateSession, getRedis } from '@mug/db';
import { RoomManager, type PlayerData } from './state';

const SHUTDOWN_TIMEOUT_MS = 5_000;
const MAX_DB_CONNECTIONS = Number(process.env.BANCHO_DB_POOL_MAX ?? 2);
const shuttingDown = { value: false };

void MAX_DB_CONNECTIONS;

const redis = getRedis();
const roomManager = new RoomManager((event) => {
	redis.publish('global-lobby', JSON.stringify(event));
});

const server = Bun.serve<PlayerData>({
	// Default to 3001 to match PUBLIC_WS_URL in the web app
	port: Number(process.env.BANCHO_PORT ?? 3001),
	async fetch(req, srv) {
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
			ws.send(JSON.stringify({ op: 'ack', data: { message: 'connected', lobby: roomManager.getLobbyList() } }));
		},
		message(ws, msg) {
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
						const room = roomManager.createRoom(ws, (parsed as any).data?.name ?? 'Room');
						ws.send(JSON.stringify({ op: 'ack', data: { message: 'room_created', roomId: room.id, name: room.name } }));
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
						} catch (err: any) {
							ws.send(JSON.stringify({ op: 'error', data: { code: ErrorCode.NOT_FOUND, message: err?.message ?? 'join failed' } }));
						}
						break;
					}
					case 'leave_room': {
						roomManager.leaveRoom(ws);
						ws.send(JSON.stringify({ op: 'ack', data: { message: 'left_room' } }));
						break;
					}
					case 'score_update': {
						// TODO: broadcast to room or store scores
						break;
					}
					case 'match_finished': {
						// TODO: handle match end aggregation
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
			roomManager.leaveRoom(ws);
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

