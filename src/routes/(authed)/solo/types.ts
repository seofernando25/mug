import { orpcClient } from "$lib/rpc/client";

export type SongListItem = Awaited<ReturnType<typeof orpcClient.song.list>>['items'][number];
