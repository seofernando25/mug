export enum ErrorCode {
	UNAUTHORIZED = "UNAUTHORIZED",
	BAD_REQUEST = "BAD_REQUEST",
	NOT_FOUND = "NOT_FOUND",
	CONFLICT = "CONFLICT",
	INTERNAL = "INTERNAL",
}

export interface ErrorPayload {
	code: ErrorCode;
	message?: string;
}
