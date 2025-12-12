import { type } from "arktype";

export const RegisterFormSchema = type({
	username: 'string.alphanumeric>0',
	email: 'string.email',
	password: 'string>=8',
});
export type RegisterFormData = typeof RegisterFormSchema.infer;
