import { os } from '@orpc/server'
import { installSongProcedure } from './install-song'
import { getSongProcedure } from './get-song'
import { checkUsernameProcedure } from './check-username'
import { listSongsProcedure } from './list-songs'





export const router = {
	song: {
		install: installSongProcedure,
		get: getSongProcedure,
		list: listSongsProcedure
	},
	user: {
		checkUsername: checkUsernameProcedure
	}
}
