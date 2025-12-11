import { writable } from 'svelte/store';
import { type ClientPacket, assertServerPacket, type ServerPacket } from '@mug/contract';
import { type } from 'arktype';
import { PUBLIC_WS_URL } from '$env/static/public';

export const socketStatus = writable<'disconnected' | 'connecting' | 'connected'>('disconnected');
export const lobbyRooms = writable<any[]>([]); // TODO: replace any with RoomSummary once server sends structured lobby data

class GameSocket {
	private ws: WebSocket | null = null;
	private shouldReconnect = true;
	private reconnectDelayMs = 2000;
	private url: string;

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
				const raw = JSON.parse(event.data);
				assertServerPacket(raw);
				const packet = raw as ServerPacket;
				this.handlePacket(packet);
			} catch (e: any) {
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
			this.ws.send(JSON.stringify(packet));
		} else {
			console.warn('Cannot send packet: socket not connected');
		}
	}

	disconnect() {
		this.shouldReconnect = false;
		this.ws?.close();
	}

	private handlePacket(packet: ServerPacket) {
		switch (packet.op) {
			case 'ack': {
				const lobby = (packet.data as any)?.lobby;
				if (Array.isArray(lobby)) {
					lobbyRooms.set(lobby);
				}
				break;
			}
			case 'room_event': {
				// TODO: update lobbyRooms when server emits lobby events
				break;
			}
			case 'pong':
			case 'error':
			default:
				break;
		}
	}
}

const BANCHO_URL = PUBLIC_WS_URL || 'ws://localhost:3001';
export const gameSocket = new GameSocket(BANCHO_URL);

