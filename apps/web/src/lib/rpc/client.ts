import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { router } from '../server/rpc/router'
import { browser } from '$app/environment'

const link = new RPCLink({
	url: browser ? window.location.origin + '/rpc' : 'http://localhost:3000/rpc',
	headers: { Authorization: 'Bearer token' },
})

export const orpcClient: RouterClient<typeof router> = createORPCClient(link)