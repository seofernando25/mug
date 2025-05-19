import { fail, redirect } from '@sveltejs/kit';
import { type } from 'arktype';
import { RegisterFormSchema } from './schema';
import { auth } from '$lib/server/auth';

export const actions = {
	default: async (event) => {
		console.log("Registering user");
		const formData = await event.request.formData();
		const entries = Object.fromEntries(formData.entries());

		const result = RegisterFormSchema(entries);

		// Check for validation problems
		// 'problems' is a typical field in ArkType's result for errors
		if (result instanceof type.errors) {
			return fail(400, {
				data: entries,
				errors: result.map((p) => ({ // Added type hint for p
					path: p.path.join('.'),
					message: p.message
				}))
			});
		}

		const { username, email, password } = result;

		try {
			// Attempt to create the user
			const response = await auth.api.signUpEmail({
				body: {
					username: username,
					name: username,
					email: email,
					password: password,
				}
			});

			const loginResponse = await auth.api.signInEmail({
				body: {
					email: email,
					password: password,
				},
				returnHeaders: true,
				asResponse: true
			});



		} catch (e: any) {
			if (e.status === "UNPROCESSABLE_ENTITY" &&
				(e.body?.code === "USER_ALREADY_EXISTS" || e.body?.code === "USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER")) {
				return fail(422, {
					data: entries,
					errors: [{ path: 'form', message: 'An account with this username or email already exists.' }]
				});
			}

			if (e.status === "UNPROCESSABLE_ENTITY" && e.body?.code === "USERNAME_IS_INVALID") {
				return fail(422, {
					data: entries,
					errors: [{ path: 'form', message: 'Username is invalid. Please try another.' }]
				});
			}

			return fail(500, {
				data: entries,
				errors: [{ path: 'form', message: 'An unexpected error occurred. Please try again later.' }]
			});
		}

		throw redirect(302, '/home');
	},
}; 