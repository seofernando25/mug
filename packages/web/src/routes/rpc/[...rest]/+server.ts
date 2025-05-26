import { type RequestHandler } from '@sveltejs/kit'
import { handler } from 'api/src/router'

const handle: RequestHandler = async ({ request }) => {
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