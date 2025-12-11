import { writable } from 'svelte/store';
import { type ClientPacket, assertServerPacket, type ServerPacket } from '@mug/contract';
import { type } from 'arktype';
import type { RoomSummary, RoomState } from './types';

export const socketStatus = writable<'disconnected' | 'connecting' | 'connected'>('disconnected');
export const lobbyRooms = writable<RoomSummary[]>([]);
export const currentRoomState = writable<RoomState | null>(null);

export interface PeerState {
	userId: string;
	username?: string | null;
	score: number;
	combo: number;
	maxCombo?: number;
	health?: number;
	finished: boolean;
}

// Map<userId, PeerState>
export const matchState = writable<Record<string, PeerState>>({});

class GameSocket {
	private ws: WebSocket | null = null;
	private shouldReconnect = true;
	private reconnectDelayMs = 2000;
	private url: string;
	private ackWaiters: Array<(packet: any) => boolean> = [];
	private requestRoomState(roomId: string) {
		this.send({ op: 'get_room_state', data: { roomId } } as any);
	}

	constructor(url: string) {
		this.url = url;
	}

	connect() {
		if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
			return;
		}
		socketStatus.set('connecting');
		this.ws = new WebSocket(this.url);

		this.ws.onopen = () => {
			socketStatus.set('connected');
		};

		this.ws.onclose = () => {
			socketStatus.set('disconnected');
			if (this.shouldReconnect) {
				setTimeout(() => this.connect(), this.reconnectDelayMs);
			}
		};

		this.ws.onmessage = (event) => {
			try {
				console.log('[ws] raw message', event.data);
				const raw = JSON.parse(event.data);
				if (raw?.op === 'peer_score_update') {
					console.log('[ws] incoming peer_score_update raw', raw);
					const userId = raw?.data?.userId;
					const score = raw?.data?.score;
					if (
						typeof userId !== 'string' ||
						userId.length === 0 ||
						typeof score !== 'number' ||
						Number.isNaN(score)
					) {
						console.warn('Dropping invalid peer_score_update packet from server (client guard)', raw);
						return;
					}
					// Manually handle valid peer_score_update to avoid global assert failure
					this.handlePacket(raw as ServerPacket);
					return;
				}
				if (raw?.op === 'peer_match_finished') {
					const userId = raw?.data?.userId;
					const finalScore = raw?.data?.finalScore;
					if (typeof userId !== 'string' || typeof finalScore !== 'number' || Number.isNaN(finalScore)) {
						console.warn('Dropping invalid peer_match_finished packet from server', raw);
						return;
					}
					// Manually handle to avoid assert failure on malformed packets
					this.handlePacket(raw as ServerPacket);
					return;
				}
				if (raw?.op === 'room_list' || raw?.op === 'room_state') {
					this.handlePacket(raw as ServerPacket);
					return;
				}
				if (raw?.op === 'score_update') {
					const score = raw?.data?.score;
					if (typeof score !== 'number' || Number.isNaN(score)) {
						console.warn('Dropping invalid score_update packet from server', raw);
						return;
					}
				}
				assertServerPacket(raw);
				const packet = raw as ServerPacket;
				this.handlePacket(packet);
				if (packet.op === 'ack') {
					this.ackWaiters = this.ackWaiters.filter((fn) => !fn(packet));
				}
			} catch (e: any) {
				console.error('WS packet parse/validate error; raw data:', event.data);
				if (e instanceof type.errors) {
					console.error('Invalid server packet:', e.summary);
				} else {
					console.error('Packet parse error', e);
				}
			}
		};
	}

	send(packet: ClientPacket) {
		if (this.ws?.readyState === WebSocket.OPEN) {
			console.log('[ws] sending packet', packet);
			this.ws.send(JSON.stringify(packet));
		} else {
			console.warn('Cannot send packet: socket not connected');
		}
	}

	disconnect() {
		this.shouldReconnect = false;
		this.ws?.close();
	}

	waitForAck<T = any>(predicate: (packet: any) => T | null | false, timeoutMs = 2000) {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.ackWaiters = this.ackWaiters.filter((fn) => fn !== handler);
				reject(new Error('Ack timeout'));
			}, timeoutMs);
			const handler = (packet: any) => {
				try {
					const result = predicate(packet);
					if (result) {
						clearTimeout(timer);
						resolve(result);
						return true;
					}
				} catch (err) {
					console.error('Ack handler error', err);
				}
				return false;
			};
			this.ackWaiters.push(handler);
		});
	}

	private handlePacket(packet: ServerPacket) {
		switch (packet.op) {
			case 'ack': {
				const lobby = (packet.data as any)?.lobby;
				if (Array.isArray(lobby)) {
					lobbyRooms.set(lobby as any);
				}
				break;
			}
			case 'room_event': {
				const ev: any = (packet as any).data ?? packet;
				lobbyRooms.update((rooms) => {
					if (!ev || !ev.type) return rooms;
					switch (ev.type) {
						case 'add': {
							const next = rooms.filter((r) => r.id !== ev.room?.id);
							if (ev.room?.id) next.push({ id: ev.room.id, name: ev.room.name, playerCount: ev.room.playerCount, status: ev.room.status, hostId: ev.room.hostId, hostName: ev.room.hostName });
							return next;
						}
						case 'remove': {
							return rooms.filter((r) => r.id !== ev.room?.id);
						}
						case 'update': {
							// server only sends id; trigger refetch on next ack or leave as-is
							return rooms;
						}
						default:
							return rooms;
					}
				});
				break;
			}
			case 'room_list': {
				const list = (packet as any).data;
				if (Array.isArray(list)) {
					lobbyRooms.set(list as any);
				}
				break;
			}
			case 'room_state': {
				const state = (packet as any).data;
				if (state && typeof state.id === 'string' && Array.isArray(state.players)) {
					currentRoomState.set(state as any);
				}
				break;
			}
			case 'peer_score_update': {
				const payload: any = (packet as any).data ?? packet;
				const { userId, username, score, combo, maxCombo, health } = payload;
				if (typeof userId !== 'string' || typeof score !== 'number' || Number.isNaN(score)) {
					console.warn('Dropping invalid peer_score_update', payload);
					return;
				}
				matchState.update((state) => ({
					...state,
					[userId]: {
						...(state[userId] ?? { userId, finished: false, combo: 0 }),
						userId,
						username: typeof username === 'string' ? username : state[userId]?.username,
						score,
						combo: typeof combo === 'number' ? combo : state[userId]?.combo ?? 0,
						maxCombo: typeof maxCombo === 'number' ? maxCombo : state[userId]?.maxCombo,
						health: typeof health === 'number' ? health : state[userId]?.health,
						finished: false
					}
				}));
				break;
			}
			case 'peer_match_finished': {
				const payload: any = (packet as any).data ?? packet;
				const { userId, finalScore, maxCombo } = payload;
				if (typeof userId !== 'string' || typeof finalScore !== 'number' || Number.isNaN(finalScore)) {
					console.warn('Dropping invalid peer_match_finished', payload);
					return;
				}
				matchState.update((state) => ({
					...state,
					[userId]: {
						...(state[userId] ?? { userId, combo: 0 }),
						userId,
						score: finalScore,
						maxCombo: typeof maxCombo === 'number' ? maxCombo : state[userId]?.maxCombo,
						finished: true
					}
				}));
				break;
			}
			case 'pong':
			case 'error':
			default:
				break;
		}
	}
}

let BANCHO_URL = 'ws://localhost:3001';
try {
	// @ts-ignore dynamic import only available at build, ignored in tests
	const env = await import('$env/static/public');
	if (env?.PUBLIC_WS_URL) BANCHO_URL = env.PUBLIC_WS_URL;
} catch {
	// Not in Svelte/Vite env (e.g., tests); fall back to default/local env
	if (typeof process !== 'undefined' && process.env?.PUBLIC_WS_URL) {
		BANCHO_URL = process.env.PUBLIC_WS_URL;
	}
}

export const gameSocket = new GameSocket(BANCHO_URL);

