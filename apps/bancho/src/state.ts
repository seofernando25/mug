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
			this.broadcastToRoom(roomId, { op: 'room_event', data: { op: 'room_event', roomId, event: 'leave', payload: { userId: player.data.user.id } } }, player);
			// TODO: reassign host when host leaves.
		}
	}

	getLobbyList() {
		return Array.from(this.rooms.values()).map(r => ({
			id: r.id,
			name: r.name,
			playerCount: r.players.size,
			status: r.status,
		}));
	}

	broadcastToRoom(roomId: string, packet: ServerPacket, exclude?: ServerWebSocket<PlayerData>) {
		const room = this.rooms.get(roomId);
		if (!room) return;
		const msg = JSON.stringify(packet);
		for (const p of room.players) {
			if (p === exclude) continue;
			p.send(msg);
		}
	}
}

