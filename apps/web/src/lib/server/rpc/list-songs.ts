import { db, s3 } from "@mug/db";
import { type } from "arktype";
import { routerBaseContext } from "./context";

export const ListSongsInput = type({});

export const listSongsProcedure = routerBaseContext
	.input(ListSongsInput)
	.handler(async ({ input: _input }) => {
		try {
			const songsWithCharts = await db.query.song.findMany({
				with: {
					charts: {
						columns: {
							difficultyName: true,
						},
					},
				},
			});

			const items = songsWithCharts.map((s) => {
				const difficultyNames = s.charts.map((c) => c.difficultyName);
				const uniqueDifficulties = [...new Set(difficultyNames)].sort();

				return {
					...s,
					difficulties: uniqueDifficulties,
				};
			});

			const itemsWithSignedUrls = await Promise.all(
				items.map(async (item: (typeof items)[0]) => {
					let imageUrl: string | null = null;
					let audioUrl: string | null = null;

					if (item.imageS3Key) {
						imageUrl = s3.presign(item.imageS3Key, {
							acl: "public-read",
						});
					}

					if (item.audioS3Key) {
						audioUrl = s3.presign(item.audioS3Key, {
							acl: "public-read",
						});
					}

					return {
						...item,
						imageUrl,
						audioUrl,
					};
				}),
			);

			return { items: itemsWithSignedUrls };
		} catch (e: unknown) {
			console.error("Error listing songs:", e);
			throw new Error(
				e instanceof Error
					? e.message
					: "An error occurred while listing songs.",
			);
		}
	});
