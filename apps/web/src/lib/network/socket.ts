import { writable } from "svelte/store";
import { type } from "arktype";
import {
	type ClientPacketSchema,
	ServerPacketSchema,
	type ClientPacketOp,
	type ClientPacketData,
	type RoomSummary,
} from "@mug/contract";
import { PUBLIC_WS_URL } from "$env/static/public";

// Type alias for room state data from room_state packet
type RoomState = {
	id: string;
	name?: string;
	hostId?: string | null;
	hostName?: string | null;
	status?: string;
	startTime?: number;
	currentChart?: {
		coverUrl?: string;
		name?: string;
		artist?: string;
		difficulty?: string;
		songId?: string;
		difficulties?: string[];
	};
	players: Array<{
		userId: string;
		username?: string | null;
		avatarUrl?: string | null;
	}>;
};
// RoomSummary is now RoomInfo from contract, RoomState is the data from room_state packet

// Type aliases for ArkType schemas
type ClientPacket = typeof ClientPacketSchema.infer;
type ServerPacket = typeof ServerPacketSchema.infer;

export const socketStatus = writable<
	"disconnected" | "connecting" | "connected"
>("disconnected");
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

export function clearMatchState() {
	matchState.set({});
}

class GameSocket {
	private ws: WebSocket | null = null;
	private shouldReconnect = true;
	private reconnectDelayMs = 2000;
	private url: string;
	private packetWaiters: Array<(packet: ServerPacket) => boolean> = [];
	private messageQueue: ClientPacket[] = [];
	private pongCallback: ((data: { message?: string; serverTime?: number; t1?: number }) => void) | null = null;

	constructor(url: string) {
		this.url = url;
	}

	connect() {
		if (
			this.ws &&
			(this.ws.readyState === WebSocket.OPEN ||
				this.ws.readyState === WebSocket.CONNECTING)
		) {
			return;
		}
		socketStatus.set("connecting");
		console.log("[ws] connecting to", this.url);
		this.ws = new WebSocket(this.url);

		this.ws.onopen = () => {
			console.log("[ws] connected successfully");
			socketStatus.set("connected");
			// Send any queued messages now that we're connected
			while (this.messageQueue.length > 0) {
				const packet = this.messageQueue.shift();
				if (packet) {
					this.ws?.send(JSON.stringify(packet));
					console.log("[ws] sent queued packet", packet);
				}
			}
		};

		this.ws.onerror = (error) => {
			console.error("[ws] connection error:", error);
			console.error("[ws] URL was:", this.url);
		};

		this.ws.onclose = (event) => {
			console.log("[ws] connection closed", event);
			socketStatus.set("disconnected");
			// Clear message queue on disconnect to avoid sending stale messages
			this.messageQueue.length = 0;
			if (this.shouldReconnect) {
				setTimeout(() => this.connect(), this.reconnectDelayMs);
			}
		};

		this.ws.onmessage = (event) => {
			try {
				console.log("[ws] raw message", event.data);
				const raw = JSON.parse(event.data);

				// 1. Validate with ArkType
				const result = ServerPacketSchema(raw);

				if (result instanceof type.errors) {
					console.warn("Ignoring invalid packet:", result.summary, raw);
					return;
				}

				// 2. Result is now typed as the discriminated union
				const packet = result;

				// 2. Handle validated packet
				this.handleValidatedPacket(packet);

				// 3. Handle packet waiters - call for ALL validated packets
				this.packetWaiters = this.packetWaiters.filter((fn) => !fn(packet));
			} catch (err) {
				console.error("[ws] message processing error", err);
			}
		};
	}

	// Type-safe send method
	send<Op extends ClientPacketOp>(op: Op, data?: ClientPacketData<Op>) {
		const packet = { op, data };

		if (this.ws?.readyState === WebSocket.OPEN) {
			console.log("[ws] sending packet", packet);
			this.ws.send(JSON.stringify(packet));
		} else {
			console.log("[ws] queueing packet (socket not ready)", packet);
			this.messageQueue.push(packet as ClientPacket);
		}
	}

	disconnect() {
		this.shouldReconnect = false;
		this.ws?.close();
	}

	setPongCallback(callback: (data: { message?: string; serverTime?: number; t1?: number }) => void) {
		this.pongCallback = callback;
	}

	waitForPacket<T = unknown>(
		predicate: (packet: ServerPacket) => T | null | false,
		timeoutMs = 2000,
	) {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.packetWaiters = this.packetWaiters.filter((fn) => fn !== handler);
				reject(new Error("Packet timeout"));
			}, timeoutMs);
			const handler = (packet: ServerPacket) => {
				try {
					const result = predicate(packet);
					if (result) {
						clearTimeout(timer);
						resolve(result);
						return true;
					}
				} catch (err) {
					console.error("Packet handler error", err);
				}
				return false;
			};
			this.packetWaiters.push(handler);
		});
	}

	handleValidatedPacket(packet: ServerPacket) {
		switch (packet.op) {
			case "ack": {
				const lobby = (packet.data as { lobby?: unknown })?.lobby;
				if (Array.isArray(lobby)) {
					lobbyRooms.set(lobby as RoomSummary[]);
				}
				break;
			}
			case "room_event": {
				const ev = packet.data;
				if (ev.type === "leave" && ev.payload?.userId) {
					const leftUserId = ev.payload.userId;
					matchState.update(s => {
						const next = { ...s };
						delete next[leftUserId];
						return next;
					});
				}

				lobbyRooms.update((rooms) => {
					if (!ev || !ev.type) return rooms;
					switch (ev.type) {
						case "add": {
							const next = rooms.filter((r) => r.id !== ev.room?.id);
							if (ev.room?.id)
								next.push({
									id: ev.room.id,
									name: ev.room.name,
									playerCount: ev.room.playerCount,
									status: ev.room.status,
									hostId: ev.room.hostId || undefined,
									hostName: ev.room.hostName || undefined,
								});
							return next;
						}
						case "remove": {
							return rooms.filter((r) => r.id !== ev.room?.id);
						}
						case "update": {
							// server only sends id; trigger refetch on next ack or leave as-is
							return rooms;
						}
						default:
							return rooms;
					}
				});
				break;
			}
			case "room_list": {
				const list = packet.data;
				if (Array.isArray(list)) {
					lobbyRooms.set(list as RoomSummary[]);
				}
				break;
			}
			case "room_state": {
				currentRoomState.set(packet.data as RoomState);
				break;
			}
			case "peer_score_update": {
				const { userId, username, score, combo, maxCombo, health } =
					packet.data;
				matchState.update((state) => ({
					...state,
					[userId]: {
						...(state[userId] ?? { userId, finished: false, combo: 0 }),
						userId,
						username: username ?? state[userId]?.username,
						score,
						combo: combo ?? state[userId]?.combo ?? 0,
						maxCombo: maxCombo ?? state[userId]?.maxCombo,
						health: health ?? state[userId]?.health,
						finished: false,
					},
				}));
				break;
			}
			case "peer_match_finished": {
				const { userId, finalScore, maxCombo } = packet.data;
				matchState.update((state) => ({
					...state,
					[userId]: {
						...(state[userId] ?? { userId, combo: 0 }),
						userId,
						score: finalScore,
						maxCombo: maxCombo ?? state[userId]?.maxCombo,
						finished: true,
					},
				}));
				break;
			}
			case "pong":
				if (this.pongCallback && packet.data) {
					this.pongCallback(packet.data);
				}
				break;
			default:
				break;
		}
	}
}

// Normalize URL: remove trailing slash and ensure it's a valid WebSocket URL
const getBanchoUrl = () => {
	const url = PUBLIC_WS_URL || "ws://localhost:3000";
	// Remove trailing slash if present
	return url.replace(/\/$/, "");
};

const BANCHO_URL = getBanchoUrl();

export const gameSocket = new GameSocket(BANCHO_URL);
