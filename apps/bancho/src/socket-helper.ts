import type { ServerWebSocket } from 'bun';
import type { PlayerData } from './state';
import { type ServerPacket, type ServerPacketData } from '@mug/contract';

/**
 * A type-safe wrapper around the Bun ServerWebSocket.
 * Prevents "hallucinating" packets by strictly enforcing OpCode and Data relationships.
 */
export class TypedSocket {
    constructor(private ws: ServerWebSocket<PlayerData>) {}

    get data() { return this.ws.data; }
    get readyState() { return this.ws.readyState; }

    /**
     * Type-safe send.
     * Example: socket.send('pong', { serverTime: 123 })
     */
    send<Op extends ServerPacket['op']>(op: Op, data?: ServerPacketData<Op>) {
        if (this.ws.readyState !== 1) return; // 1 = Open

        const payload = JSON.stringify({ op, data });
        this.ws.send(payload);
    }

    sendRaw(packet: ServerPacket) {
         if (this.ws.readyState !== 1) return;
         this.ws.send(JSON.stringify(packet));
    }

    close() {
        this.ws.close();
    }
}