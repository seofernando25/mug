import { ClientPacketSchema } from "@mug/contract";
import { validateSession } from "@mug/db";
import { RoomManager, type PlayerData } from "./state";
import { TypedSocket } from "./socket-helper";
import { type } from "arktype";
import type { ServerWebSocket } from "bun";
import { redis } from "bun";

const SHUTDOWN_TIMEOUT_MS = 5_000;
const MAX_DB_CONNECTIONS = Number(process.env.BANCHO_DB_POOL_MAX ?? 2);
const shuttingDown = { value: false };

void MAX_DB_CONNECTIONS;


const connections = new Set<ServerWebSocket<PlayerData>>();
const roomManager = new RoomManager((event) => {
	redis.publish("global-lobby", JSON.stringify(event));
	// Broadcast lobby events to all connected clients
	const packet = JSON.stringify({ op: "room_event", data: event });
	for (const client of connections) {
		if (client.readyState === 1) client.send(packet);
	}
});

const server = Bun.serve<PlayerData>({
	// Default to 3000 to match Coolify/exposed port
	port: Number(process.env.BANCHO_PORT ?? 3000),
	async fetch(req, srv) {
		if (shuttingDown.value) {
			return new Response("Shutting down", { status: 503 });
		}

		if (req.headers.get("upgrade") !== "websocket") {
			return new Response("Bancho WS only", { status: 400 });
		}

		const cookies = req.headers.get("cookie") ?? "";
		// better-auth sets cookie name "better-auth.session_token"
		const rawCookie = parseCookie(cookies).get("better-auth.session_token");
		if (!rawCookie) {
			return new Response("Unauthorized", { status: 401 });
		}

		// better-auth cookie format: "<token>.<signature>"
		const decoded = decodeURIComponent(rawCookie);
		const presentedToken = decoded.split(".")[0] ?? decoded;

		const session = await validateSession(presentedToken);
		if (!session) {
			return new Response("Invalid session", { status: 403 });
		}

		// Fallback for guest usernames: use username, or name, or GUEST-ID
		const displayName = session.user.username || session.user.name || `GUEST-${session.user.id.slice(0, 5).toUpperCase()}`;

		const success = srv.upgrade(req, {
			data: {
				user: {
					id: session.user.id,
					username: displayName,
				},
			},
		});

		return success
			? undefined
			: new Response("Upgrade failed", { status: 400 });
	},
	websocket: {
		open(rawWs) {
			console.log(`User connected: ${rawWs.data.user.id}`);
			connections.add(rawWs);

			// Wrap the raw socket
			const socket = new TypedSocket(rawWs);

			socket.send("ack", { message: "connected" });
			socket.send("room_list", roomManager.getLobbyList());
		},
		message(rawWs, msg) {
			const socket = new TypedSocket(rawWs);
			try {
				// 1. Parse JSON
				const rawJson =
					typeof msg === "string"
						? JSON.parse(msg)
						: JSON.parse(msg.toString());

				// 2. Validate with ArkType
				const result = ClientPacketSchema(rawJson);

				if (result instanceof type.errors) {
					console.error("Validation failed:", result.summary);
					socket.send("error", {
						code: "BAD_REQUEST",
						message: result.summary,
					});
					return;
				}

				// 3. Result is now typed as the discriminated union
				const packet = result;

				// 4. Handle Types safely
				switch (packet.op) {
					case "ping":
						socket.send("pong", {
							message: "pong",
							serverTime: Date.now(),
							t1: packet.data?.t1,
						});
						break;
					case "noop":
						break;
					case "create_room": {
						if (socket.data.roomId) roomManager.leaveRoom(rawWs);
						const name = packet.data?.name ?? "Room";
						const password = packet.data?.password;
						const room = roomManager.createRoom(rawWs, name, password);
						socket.send("ack", { message: "room_created" });

						// Send updated lobby list to all
						const lobby = roomManager.getLobbyList();
						for (const client of connections) {
							if (client.readyState === 1) {
								const clientSocket = new TypedSocket(client);
								clientSocket.send("room_list", lobby);
							}
						}

						// Send room_state to members
						const state = roomManager.getRoomState(room.id);
						if (state)
							roomManager.broadcastToRoom(room.id, {
								op: "room_state",
								data: state,
							});
						break;
					}
					case "join_room": {
						const roomId = packet.data.roomId; 
						try {
							if (socket.data.roomId && socket.data.roomId !== roomId)
								roomManager.leaveRoom(rawWs);
							roomManager.joinRoom(rawWs, roomId);
							socket.send("ack", { message: "room_joined" });
							const state = roomManager.getRoomState(roomId);
							if (state)
								roomManager.broadcastToRoom(roomId, {
									op: "room_state",
									data: state,
								});
					} catch (err: unknown) {
						socket.send("error", {
							code: "NOT_FOUND",
							message: err instanceof Error ? err.message : "join failed",
						});
					}
						break;
					}
					case "leave_room": {
						roomManager.leaveRoom(rawWs);
						socket.send("ack", { message: "left_room" });
						const lobby = roomManager.getLobbyList();
						for (const client of connections) {
							if (client.readyState === 1) {
								const clientSocket = new TypedSocket(client);
								clientSocket.send("room_list", lobby);
							}
						}
						break;
					}
					case "get_room_state": {
						const roomId = packet.data.roomId; 
						const state = roomManager.getRoomState(roomId);
						if (state) socket.send("room_state", state);
						else
							socket.send("error", {
								code: "NOT_FOUND",
								message: "room not found",
							});
						break;
					}
					case "score_update": {
						// Inject authoritative identity to avoid missing userId/username downstream
						const normalizedPayload = {
							...packet.data,
							userId: socket.data?.user?.id,
							username: socket.data?.user?.username,
						};
						roomManager.broadcastScore(rawWs, normalizedPayload);
						break;
					}
					case "match_finished": {
						const normalizedPayload = {
							...(packet.data ?? {}),
							userId: socket.data?.user?.id,
							username: socket.data?.user?.username,
						};
						roomManager.broadcastMatchFinish(rawWs, normalizedPayload);
						roomManager.markPlayerFinished(rawWs);
						break;
					}
					case "update_room": {
						const { roomId, currentChart, name, password } = packet.data; 

						// Validate that the sender is the host
						const room = roomManager.getRoomById(roomId);
						if (!room || room.hostId !== socket.data?.user?.id) {
							socket.send("error", {
								code: "BAD_REQUEST",
								message: "only host can update room",
							});
							break;
						}

						// Update fields if provided
						if (currentChart) {
							room.currentChart = currentChart;
							console.log(
								"[bancho] updated room",
								roomId,
								"chart to:",
								currentChart.name,
							);
						}

						if (name) {
							room.name = name.slice(0, 50);
						}

						if (password !== undefined) {
							room.password = password;
						}

						// Broadcast the updated room state to all clients
						const state = roomManager.getRoomState(roomId);
						if (state) {
							roomManager.broadcastToRoom(roomId, {
								op: "room_state",
								data: state,
							});
						}

						// Also broadcast lobby update if name changed
						if (name) {
							roomManager.getLobbyList().forEach((r) => {
								if (r.id === roomId) {
									// Notify lobby of update
									// Note: RoomManager doesn't expose a direct 'updateLobby' broadcast easily here 
									// without iterating all connections again, but getLobbyList() is efficient.
									// Let's just re-broadcast the lobby list to everyone in lobby.
									// Optimally we'd have a specific event for room name change.
									// For now, let's reuse the existing loop pattern from create_room/leave_room
									// or add a notify Update to roomManager. But notify logic is internal.
									// Let's just re-send list.
									const lobby = roomManager.getLobbyList();
									for (const client of connections) {
										if (client.readyState === 1) {
											const clientSocket = new TypedSocket(client);
											clientSocket.send("room_list", lobby);
										}
									}
								}
							});
						}

						socket.send("ack", { message: "room_updated" });
						break;
					}
				case "start_match": {
					const roomId = packet.data.roomId; 

					// Validate that the sender is the host
					const room = roomManager.getRoomById(roomId);
					if (!room || room.hostId !== socket.data?.user?.id) {
						socket.send("error", {
							code: "BAD_REQUEST",
							message: "only host can start match",
						});
						break;
					}

					console.log("[bancho] host initiated match loading in room", roomId);

					// Transition to loading phase (waiting for all players to load audio)
					roomManager.startMatchLoading(roomId);

					socket.send("ack", { message: "match_loading" });
					break;
				}
				case "client_ready": {
					// Player has loaded audio and is ready to start
					roomManager.markPlayerReady(rawWs);
					socket.send("ack", { message: "ready_received" });
					break;
				}
					default:
						socket.send("error", {
							code: "BAD_REQUEST",
							message: "unsupported op",
						});
						break;
				}
			} catch (err) {
				console.error("Packet error", err);
				socket.send("error", {
					code: "BAD_REQUEST",
					message: "invalid packet",
				});
			}
		},
		close(ws) {
			connections.delete(ws);
			roomManager.handleDisconnect(ws);
			const lobby = roomManager.getLobbyList();
			for (const client of connections) {
				if (client.readyState === 1)
					client.send(JSON.stringify({ op: "room_list", data: lobby }));
			}
		},
	},
});

console.log(`🏆 Bancho WS server running on port ${server.port}`);

process.on("SIGTERM", () => {
	shuttingDown.value = true;
	server.stop(true);
	setTimeout(() => process.exit(0), SHUTDOWN_TIMEOUT_MS).unref();
});

function parseCookie(cookieHeader: string): Map<string, string> {
	const map = new Map<string, string>();
	cookieHeader.split(";").forEach((part) => {
		const [k, v] = part.split("=").map((s) => s?.trim());
		if (k) map.set(k, v ?? "");
	});
	return map;
}
