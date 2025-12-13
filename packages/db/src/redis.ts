import { redis, RedisClient } from "bun";

// Use Bun's built-in Redis client
// Reads connection from REDIS_URL, VALKEY_URL, or defaults to redis://localhost:6379
let client: RedisClient | null = null;

export function getRedis(): RedisClient {
	if (!client) {
		// Create client using environment variable or default
		const url = process.env.REDIS_URL ?? process.env.VALKEY_URL ?? "redis://localhost:6379";
		client = new RedisClient(url, {
			// Connection automatically managed by Bun
			autoReconnect: true,
			maxRetries: 10,
		});
	}
	return client;
}

// Export the default redis instance for convenience
export { redis };
