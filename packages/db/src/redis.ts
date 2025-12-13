import { createClient, type RedisClientType } from "redis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";
let client: RedisClientType | null = null;
let connected = false;

export function getRedis(): RedisClientType {
	if (!client) {
		client = createClient({
			url,
			pingInterval: 10_000,
		});
		client.on("error", (err) => {
			console.error("[redis] error", err);
		});
	}
	if (!connected) {
		connected = true;
		client.connect().catch((err) => {
			console.error("[redis] failed to connect", err);
			connected = false;
		});
	}
	return client;
}
