import { type } from "arktype";

// --- ArkType Schemas ---

// --- Shared Sub-Schemas ---

const UserInfo = type({
	userId: "string",
	"username?": "string|null",
	"avatarUrl?": "string|null",
});

const RoomInfo = type({
	id: "string",
	name: "string",
	"playerCount?": "number",
	"status?": "string", // 'idle' | 'starting' | 'playing'
	"hostId?": "string|null",
	"hostName?": "string|null",
});

const ChartInfo = type({
	"coverUrl?": "string",
	"name?": "string",
	"artist?": "string",
	"difficulty?": "string",
	"songId?": "string",
	"difficulties?": "string[]",
});

const ScoreData = type({
	score: "number",
	"combo?": "number",
	"maxCombo?": "number",
	"noteId?": "string|number",
	"judgment?": "string",
	"health?": "number",
});

// --- Client Packet Types ---

const PingPacket = type({ op: "'ping'", "data?": { "t1?": "number" } });
const NoopPacket = type({ op: "'noop'" });
const CreateRoomPacket = type({
	op: "'create_room'",
	"data?": { "name?": "string" },
});
const JoinRoomPacket = type({ op: "'join_room'", data: { roomId: "string" } });
const LeaveRoomPacket = type({
	op: "'leave_room'",
	"data?": { "roomId?": "string" },
});
const GetRoomStatePacket = type({
	op: "'get_room_state'",
	data: { roomId: "string" },
});
const UpdateRoomPacket = type({
	op: "'update_room'",
	data: { roomId: "string", currentChart: ChartInfo },
});
const StartMatchPacket = type({
	op: "'start_match'",
	data: { roomId: "string" },
});
const ScoreUpdatePacket = type({ op: "'score_update'", data: ScoreData });
const MatchFinishedPacket = type({
	op: "'match_finished'",
	"data?": { "score?": "number", "maxCombo?": "number" },
});

// --- Client Packets (Sent by Web Client) ---

export const ClientPacketSchema = PingPacket.or(NoopPacket)
	.or(CreateRoomPacket)
	.or(JoinRoomPacket)
	.or(LeaveRoomPacket)
	.or(GetRoomStatePacket)
	.or(UpdateRoomPacket)
	.or(StartMatchPacket)
	.or(ScoreUpdatePacket)
	.or(MatchFinishedPacket);

// --- Server Packet Types ---

const PongPacket = type({
	op: "'pong'",
	"data?": { "message?": "string", "serverTime?": "number", "t1?": "number" },
});
const AckPacket = type({
	op: "'ack'",
	"data?": {
		"message?": "string",
		"roomId?": "string",
		"name?": "string",
	},
});
const ErrorPacket = type({
	op: "'error'",
	data: {
		code: "'UNAUTHORIZED'|'BAD_REQUEST'|'NOT_FOUND'|'CONFLICT'|'INTERNAL'",
		"message?": "string",
	},
});
const RoomListPacket = type({ op: "'room_list'", data: RoomInfo.array() });
const RoomEventPacket = type({
	op: "'room_event'",
	data: { type: "'add'|'remove'|'update'", "room?": RoomInfo, "id?": "string" },
});
const RoomStatePacket = type({
	op: "'room_state'",
	data: {
		id: "string",
		"name?": "string",
		"hostId?": "string|null",
		"hostName?": "string|null",
		"status?": "string",
		"startTime?": "number",
		"currentChart?": ChartInfo,
		players: UserInfo.array(),
	},
});
const PeerScoreUpdatePacket = type({
	op: "'peer_score_update'",
	data: ScoreData.and({ userId: "string", "username?": "string" }),
});
const PeerMatchFinishedPacket = type({
	op: "'peer_match_finished'",
	data: { userId: "string", finalScore: "number", "maxCombo?": "number" },
});
const ServerScoreUpdatePacket = type({ op: "'score_update'", data: ScoreData });
const ServerMatchFinishedPacket = type({
	op: "'match_finished'",
	"data?": { "score?": "number", "maxCombo?": "number" },
});

// --- Server Packets (Sent by Bancho) ---

export const ServerPacketSchema = PongPacket.or(AckPacket)
	.or(ErrorPacket)
	.or(RoomListPacket)
	.or(RoomEventPacket)
	.or(RoomStatePacket)
	.or(PeerScoreUpdatePacket)
	.or(PeerMatchFinishedPacket)
	.or(ServerScoreUpdatePacket)
	.or(ServerMatchFinishedPacket);

// --- Helper Types for Autocomplete ---

// Extract op types from ArkType schemas
export type ClientPacketOp = (typeof ClientPacketSchema.infer)["op"];
export type ServerPacketOp = (typeof ServerPacketSchema.infer)["op"];

// Helper to extract the 'data' type for a specific 'op' from ArkType schemas
export type ClientPacketData<Op extends ClientPacketOp> =
	Extract<typeof ClientPacketSchema.infer, { op: Op }> extends {
		data?: infer D;
	}
		? D
		: never;

export type ServerPacketData<Op extends ServerPacketOp> =
	Extract<typeof ServerPacketSchema.infer, { op: Op }> extends {
		data?: infer D;
	}
		? D
		: never;
