import type { ServerWebSocket } from "bun";
import type { ServerPacket } from "@mug/contract";

type ScoreUpdateData = {
	score: number;
	userId: string;
	username?: string | null;
	combo?: number;
	maxCombo?: number;
	noteId?: string | number;
	judgment?: string;
	health?: number;
};

type MatchFinishData = {
	score?: number;
	maxCombo?: number;
};

export type LobbyNotifier = (
	event:
		| { type: "add" | "remove"; room: { id: string; name: string } }
		| { type: "update"; id: string },
) => void;

export interface PlayerData {
	user: { id: string; username?: string | null };
	roomId?: string;
}

type Room = {
	id: string;
	name: string;
	hostId: string;
	players: Set<ServerWebSocket<PlayerData>>;
	status: "idle" | "starting" | "playing";
	startTime?: number;
	currentChart?: {
		coverUrl?: string;
		name?: string;
		artist?: string;
		difficulty?: string;
		songId?: string;
		difficulties?: string[];
	};
};

export class RoomManager {
	private rooms = new Map<string, Room>();
	private notify: LobbyNotifier;
	private disconnectTimers = new Map<string, Timer>();
	private setTimeoutFn: (callback: () => void, delay: number) => Timer;
	private clearTimeoutFn: (id: Timer) => void;

	constructor(
		notify: LobbyNotifier = () => {},
		setTimeoutFn: (
			callback: () => void,
			delay: number,
		) => Timer = global.setTimeout,
		clearTimeoutFn: (id: Timer) => void = global.clearTimeout,
	) {
		this.notify = notify;
		this.setTimeoutFn = setTimeoutFn;
		this.clearTimeoutFn = clearTimeoutFn;
	}

	createRoom(player: ServerWebSocket<PlayerData>, name: string): Room {
		// Enforce single room per host (by user id). If this user already hosts a room, remove it.
		for (const [id, room] of this.rooms.entries()) {
			if (room.hostId === player.data.user.id) {
				this.rooms.delete(id);
				this.notify({ type: "remove", room: { id, name: room.name } });
			}
		}

		const roomId = crypto.randomUUID();
		const room: Room = {
			id: roomId,
			name: name.slice(0, 50),
			hostId: player.data.user.id,
			players: new Set([player]),
			status: "idle",
		};
		this.rooms.set(roomId, room);
		player.data.roomId = roomId;
		this.notify({ type: "add", room: { id: roomId, name: room.name } });
		return room;
	}

	joinRoom(player: ServerWebSocket<PlayerData>, roomId: string): Room {
		const userId = player.data.user.id;

		const pendingTimer = this.disconnectTimers.get(userId);
		if (pendingTimer) {
			this.clearTimeoutFn(pendingTimer);
			this.disconnectTimers.delete(userId);
			this.swapSocket(roomId, userId, player);
			const room = this.rooms.get(roomId);
			if (!room) throw new Error("Room not found after socket swap");
			return room;
		}

		// Normal join logic
		const room = this.rooms.get(roomId);
		if (!room) throw new Error("Room not found");

		const existingPlayer = Array.from(room.players).find(
			(p) => p.data.user.id === userId,
		);
		if (existingPlayer) room.players.delete(existingPlayer);

		room.players.add(player);
		player.data.roomId = roomId;
		this.broadcastToRoom(
			roomId,
			{
				op: "room_event",
				data: {
					op: "room_event",
					roomId,
					event: "join",
					payload: { userId: player.data.user.id },
				},
			},
			player,
		);
		return room;
	}

	private reallyLeaveRoom(player: ServerWebSocket<PlayerData>): void {
		const roomId = player.data.roomId;
		if (!roomId) return;
		const room = this.rooms.get(roomId);
		if (!room) return;

		room.players.delete(player);
		player.data.roomId = undefined;

		if (room.players.size === 0) {
			this.rooms.delete(roomId);
			this.notify({ type: "remove", room: { id: roomId, name: room.name } });
		} else {
			// If the host left, reassign to the next available player
			if (room.hostId === player.data.user.id) {
				const [nextHost] = Array.from(room.players);
				if (nextHost) {
					room.hostId = nextHost.data.user.id;
					this.notify({ type: "update", id: roomId });
				}
			}
			this.broadcastToRoom(
				roomId,
				{
					op: "room_event",
					data: {
						op: "room_event",
						roomId,
						event: "leave",
						payload: { userId: player.data.user.id },
					},
				},
				player,
			);
			const state = this.getRoomState(roomId);
			if (state) {
				this.broadcastToRoom(roomId, { op: "room_state", data: state });
			}
		}
	}

	handleDisconnect(player: ServerWebSocket<PlayerData>): void {
		const roomId = player.data.roomId;
		const userId = player.data.user.id;
		if (!roomId) return;

		// Start a 5-second timer. If the timeout fires, call reallyLeaveRoom
		const timer = this.setTimeoutFn(() => {
			this.reallyLeaveRoom(player);
			this.disconnectTimers.delete(userId);
		}, 5000); // 5 Seconds Grace Period

		this.disconnectTimers.set(userId, timer);
	}

	// Public method for intentional leaves (not disconnections)
	leaveRoom(player: ServerWebSocket<PlayerData>): void {
		// Cancel any pending disconnect timer for this user
		const userId = player.data.user.id;
		const pendingTimer = this.disconnectTimers.get(userId);
		if (pendingTimer) {
			this.clearTimeoutFn(pendingTimer);
			this.disconnectTimers.delete(userId);
		}

		// Immediately leave the room
		this.reallyLeaveRoom(player);
	}

	private swapSocket(
		roomId: string,
		userId: string,
		newSocket: ServerWebSocket<PlayerData>,
	): void {
		const room = this.rooms.get(roomId);
		if (!room) return;

		// Find the old socket for this user and replace it
		for (const existingSocket of room.players) {
			if (existingSocket.data.user.id === userId) {
				room.players.delete(existingSocket);
				break;
			}
		}
		room.players.add(newSocket);
		newSocket.data.roomId = roomId;
	}

	getLobbyList() {
		return Array.from(this.rooms.values()).map((r) => ({
			id: r.id,
			name: r.name,
			playerCount: r.players.size,
			status: r.status,
			hostId: r.hostId,
			hostName: this.getHostName(r),
		}));
	}

	getRoomState(roomId: string) {
		const room = this.rooms.get(roomId);
		if (!room) return null;

		// Deduplicate players by userId (in case of multiple sockets per user)
		const uniquePlayers = new Map<
			string,
			{ userId: string; username: string | null; avatarUrl: null }
		>();
		for (const player of room.players) {
			const userId = player.data.user.id;
			if (!uniquePlayers.has(userId)) {
				uniquePlayers.set(userId, {
					userId,
					username: player.data.user.username ?? null,
					avatarUrl: null,
				});
			}
		}

		return {
			id: room.id,
			name: room.name,
			hostId: room.hostId,
			hostName: this.getHostName(room),
			status: room.status,
			startTime: room.startTime,
			currentChart: room.currentChart,
			players: Array.from(uniquePlayers.values()),
		};
	}

	getRoomById(roomId: string) {
		return this.rooms.get(roomId) || null;
	}

	private getHostName(room: Room) {
		const host = Array.from(room.players).find(
			(p) => p.data.user.id === room.hostId,
		);
		return host?.data.user.username ?? host?.data.user.id ?? null;
	}

	broadcastToRoom(
		roomId: string,
		packet: ServerPacket,
		exclude?: ServerWebSocket<PlayerData>,
	) {
		const room = this.rooms.get(roomId);
		if (!room) return;
		if (
			packet.op === "peer_score_update" ||
			packet.op === "peer_match_finished"
		) {
			console.log(
				"[bancho] sending",
				packet.op,
				"to room",
				roomId,
				"packet",
				JSON.stringify(packet),
				"playerCount",
				room.players.size,
			);
		}
		const msg = JSON.stringify(packet);
		for (const p of room.players) {
			if (p === exclude) continue;
			p.send(msg);
		}
	}

	broadcastScore(player: ServerWebSocket<PlayerData>, data: ScoreUpdateData) {
		const roomId = player.data.roomId;
		if (!roomId) return;
		const score = data?.score;
		const userId = player.data.user?.id;
		if (!userId || typeof userId !== "string") return;
		if (typeof score !== "number" || Number.isNaN(score)) return;
		const packet: ServerPacket = {
			op: "peer_score_update",
			data: {
				userId,
				username: player.data.user?.username ?? null,
				score,
				combo: typeof data?.combo === "number" ? data.combo : undefined,
				maxCombo:
					typeof data?.maxCombo === "number" ? data.maxCombo : undefined,
				health: typeof data?.health === "number" ? data.health : undefined,
			},
		};
		console.log("[bancho] broadcasting score", JSON.stringify(packet));
		this.broadcastToRoom(roomId, packet, player); // exclude sender to reduce echo
	}

	broadcastMatchFinish(player: ServerWebSocket<PlayerData>, data: MatchFinishData) {
		const roomId = player.data.roomId;
		if (!roomId) return;
		const userId = player.data.user?.id;
		if (!userId || typeof userId !== "string") return;
		const packet: ServerPacket = {
			op: "peer_match_finished",
			data: {
				userId,
				finalScore: typeof data?.score === "number" ? data.score : 0,
				maxCombo:
					typeof data?.maxCombo === "number" ? data.maxCombo : undefined,
			},
		};
		console.log("[bancho] broadcasting match_finish", JSON.stringify(packet));
		this.broadcastToRoom(roomId, packet);
	}
}
