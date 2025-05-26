import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { router } from 'api/src/router'
import { browser } from '$app/environment'

const link = new RPCLink({
	url: browser ? window.location.origin + '/rpc' : 'http://localhost:3000/rpc',
})

export const orpcClient: RouterClient<typeof router> = createORPCClient(link)