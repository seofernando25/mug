import { os } from "@orpc/server";

export const routerBaseContext = os.$context<{ headers: Headers }>()
