import { queueSongUpload } from "@mug/db";
import { ORPCError } from "@orpc/server";
import { type } from "arktype";
import { requireAuth } from "./middleware/auth";
import { routerBaseContext } from "./context";

const InstallSongInput = type({
	file: "File",
});

export const installSongProcedure = routerBaseContext
	.use(requireAuth)
	.input(InstallSongInput)
	.handler(async ({ input, context }) => {
		const uploaderId = context.auth.user.id;
		const uploadedFile = input.file;

		try {
			// Queue for background processing
			const queueKey = process.env.UPLOAD_QUEUE_KEY ?? "upload-jobs";
			const result = await queueSongUpload(
				uploadedFile,
				uploaderId,
				queueKey,
			);
			return result;
		} catch (err) {
			console.error("Song installation failed:", err);
			const message =
				err instanceof Error ? err.message : "Unknown error occurred";

			if (message.includes("Failed to process file")) {
				throw new ORPCError("BAD_REQUEST", { message });
			} else {
				throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
			}
		}
	});
