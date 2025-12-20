import { type } from 'arktype';

export const wsRoomListSchema = type({
	op: "'room_list'",
	data: [
		{
			id: 'string>0',
			name: 'string>0',
			playerCount: 'number >= 0?',
			status: 'string?',
			hostId: 'string?',
			hostName: 'string?',
			currentChart: type({
				coverUrl: 'string?',
				name: 'string?',
				artist: 'string?',
				difficultyName: 'string?'
			}).optional(),
			isPasswordProtected: 'boolean?',
			owner: type({
				id: 'string>0',
				name: 'string?',
				avatarUrl: 'string?'
			}).optional()
		}
	]
});

export const wsRoomEventSchema = type({
	op: "'room_event'",
	data: {
		type: "'add' | 'remove' | 'update'",
		room: type({
			id: 'string>0',
			name: 'string?',
			playerCount: 'number >= 0?',
			status: 'string?',
			hostId: 'string?',
			hostName: 'string?'
		}).optional()
	}
});

export const wsRoomStateSchema = type({
	op: "'room_state'",
	data: {
		id: 'string>0',
		name: 'string?',
		hostId: 'string?',
		hostName: 'string?',
		players: [
			{
				userId: 'string>0',
				username: 'string?',
				avatarUrl: 'string?'
			}
		]
	}
});

export const wsPeerScoreUpdateSchema = type({
	op: "'peer_score_update'",
	data: type({
		userId: 'string>0',
		username: 'string?',
		score: 'number',
		combo: 'number?',
		maxCombo: 'number?',
		health: 'number?'
	})
});

export const wsPeerMatchFinishedSchema = type({
	op: "'peer_match_finished'",
	data: type({
		userId: 'string>0',
		finalScore: 'number',
		maxCombo: 'number?'
	})
});

export const wsSchemas = [
	wsRoomListSchema,
	wsRoomEventSchema,
	wsRoomStateSchema,
	wsPeerScoreUpdateSchema,
	wsPeerMatchFinishedSchema
];
