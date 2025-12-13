import * as music from "./schema/music";
import * as multiplayer from "./schema/multiplayer";
import * as auth from "./schema/auth";

export const schema = { ...music, ...multiplayer, ...auth };

export * from "./auth";
export * from "./client";
export * from "./schema/auth";
export * from "./schema/music";
export * from "./schema/multiplayer";
export * from "./s3";
export * from "./actions/songs";
