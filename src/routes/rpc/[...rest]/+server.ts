import { error, type RequestHandler } from '@sveltejs/kit'
import { RPCHandler } from '@orpc/server/fetch'
import { router } from '$lib/server/rpc/router'

const handler = new RPCHandler(router)

const handle: RequestHandler = async ({ request }) => {
	// console.log('Request headers:', request.headers);
	const { response } = await handler.handle(request, {
		prefix: '/rpc',
		context: { headers: request.headers }
	})

	return response ?? new Response('Not Found', { status: 404 })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle