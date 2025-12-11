import type { ServerWebSocket } from 'bun';
import { type ServerPacket } from '@mug/contract';

export type LobbyNotifier = (event: { type: 'add' | 'remove'; room: { id: string; name: string } } | { type: 'update'; id: string }) => void;

export interface PlayerData {
	user: { id: string; username?: string | null };
	roomId?: string;
}

type Room = {
	id: string;
	name: string;
	hostId: string;
	players: Set<ServerWebSocket<PlayerData>>;
	status: 'idle' | 'playing';
};

export class RoomManager {
	private rooms = new Map<string, Room>();
	private notify: LobbyNotifier;

	constructor(notify: LobbyNotifier = () => {}) {
		this.notify = notify;
	}

	createRoom(player: ServerWebSocket<PlayerData>, name: string): Room {
		// Enforce single room per host (by user id). If this user already hosts a room, remove it.
		for (const [id, room] of this.rooms.entries()) {
			if (room.hostId === player.data.user.id) {
				this.rooms.delete(id);
				this.notify({ type: 'remove', room: { id, name: room.name } });
			}
		}

		const roomId = crypto.randomUUID();
		const room: Room = {
			id: roomId,
			name: name.slice(0, 50),
			hostId: player.data.user.id,
			players: new Set([player]),
			status: 'idle'
		};
		this.rooms.set(roomId, room);
		player.data.roomId = roomId;
		this.notify({ type: 'add', room: { id: roomId, name: room.name } });
		return room;
	}

	joinRoom(player: ServerWebSocket<PlayerData>, roomId: string): Room {
		const room = this.rooms.get(roomId);
		if (!room) throw new Error('Room not found');
		room.players.add(player);
		player.data.roomId = roomId;
		this.broadcastToRoom(roomId, { op: 'room_event', data: { op: 'room_event', roomId, event: 'join', payload: { userId: player.data.user.id } } }, player);
		return room;
	}

	leaveRoom(player: ServerWebSocket<PlayerData>): void {
		const roomId = player.data.roomId;
		if (!roomId) return;
		const room = this.rooms.get(roomId);
		if (!room) return;

		room.players.delete(player);
		player.data.roomId = undefined;

		if (room.players.size === 0) {
			this.rooms.delete(roomId);
			this.notify({ type: 'remove', room: { id: roomId, name: room.name } });
		} else {
			// If the host left, reassign to the next available player
			if (room.hostId === player.data.user.id) {
				const [nextHost] = Array.from(room.players);
				if (nextHost) {
					room.hostId = nextHost.data.user.id;
					this.notify({ type: 'update', id: roomId });
				}
			}
			this.broadcastToRoom(
				roomId,
				{ op: 'room_event', data: { op: 'room_event', roomId, event: 'leave', payload: { userId: player.data.user.id } } },
				player
			);
			const state = this.getRoomState(roomId);
			if (state) {
				this.broadcastToRoom(roomId, { op: 'room_state', data: state });
			}
		}
	}

	getLobbyList() {
		return Array.from(this.rooms.values()).map(r => ({
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
		return {
			id: room.id,
			name: room.name,
			hostId: room.hostId,
			hostName: this.getHostName(room),
			players: Array.from(room.players).map((p) => ({
				userId: p.data.user.id,
				username: p.data.user.username ?? null,
				avatarUrl: null
			}))
		};
	}

	private getHostName(room: Room) {
		const host = Array.from(room.players).find(p => p.data.user.id === room.hostId);
		return host?.data.user.username ?? host?.data.user.id ?? null;
	}

	broadcastToRoom(roomId: string, packet: ServerPacket, exclude?: ServerWebSocket<PlayerData>) {
		const room = this.rooms.get(roomId);
		if (!room) return;
		if (packet.op === 'peer_score_update' || packet.op === 'peer_match_finished') {
			console.log(
				'[bancho] sending',
				packet.op,
				'to room',
				roomId,
				'packet',
				JSON.stringify(packet),
				'playerCount',
				room.players.size
			);
		}
		const msg = JSON.stringify(packet);
		for (const p of room.players) {
			if (p === exclude) continue;
			p.send(msg);
		}
	}

	broadcastScore(player: ServerWebSocket<PlayerData>, data: any) {
		const roomId = player.data.roomId;
		if (!roomId) return;
		const score = data?.score;
		const userId = player.data.user?.id;
		if (!userId || typeof userId !== 'string') return;
		if (typeof score !== 'number' || Number.isNaN(score)) return;
		const packet: ServerPacket = {
			op: 'peer_score_update',
			data: {
				userId,
				username: player.data.user?.username ?? null,
				score,
				combo: typeof data?.combo === 'number' ? data.combo : undefined,
				maxCombo: typeof data?.maxCombo === 'number' ? data.maxCombo : undefined,
				health: typeof data?.health === 'number' ? data.health : undefined
			}
		};
		console.log('[bancho] broadcasting score', JSON.stringify(packet));
		this.broadcastToRoom(roomId, packet, player); // exclude sender to reduce echo
	}

	broadcastMatchFinish(player: ServerWebSocket<PlayerData>, data: any) {
		const roomId = player.data.roomId;
		if (!roomId) return;
		const userId = player.data.user?.id;
		if (!userId || typeof userId !== 'string') return;
		const packet: ServerPacket = {
			op: 'peer_match_finished',
			data: {
				userId,
				finalScore: typeof data?.score === 'number' ? data.score : 0,
				maxCombo: typeof data?.maxCombo === 'number' ? data.maxCombo : undefined
			}
		};
		console.log('[bancho] broadcasting match_finish', JSON.stringify(packet));
		this.broadcastToRoom(roomId, packet);
	}
}

