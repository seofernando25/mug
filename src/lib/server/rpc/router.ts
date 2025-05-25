import { RPCHandler } from '@orpc/server/fetch'
import { checkUsernameProcedure } from './check-username'
import { getSongProcedure } from './get-song'
import { installSongProcedure } from './install-song'
import { listSongsProcedure } from './list-songs'
import { createRoomProcedure, deleteRoomProcedure, getRoomProcedure, joinRoomProcedure, leaveRoomProcedure, listRoomsProcedure, updateRoomProcedure, subscribeToRoomEvents } from './multiplayer/room'





export const router = {
	song: {
		install: installSongProcedure,
		get: getSongProcedure,
		list: listSongsProcedure
	},
	user: {
		checkUsername: checkUsernameProcedure
	},
	multiplayer: {
		room: {
			create: createRoomProcedure,
			join: joinRoomProcedure,
			leave: leaveRoomProcedure,
			list: listRoomsProcedure,
			get: getRoomProcedure,
			delete: deleteRoomProcedure,
			update: updateRoomProcedure,
			subscribeToRoomEvents: subscribeToRoomEvents
		}
	}
}

export const handler = new RPCHandler(router, {
	eventIteratorKeepAliveEnabled: true,
	eventIteratorKeepAliveInterval: 1000, // 1 second
	eventIteratorKeepAliveComment: '',
})
