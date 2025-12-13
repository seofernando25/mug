import { $ } from "bun";

// "dev:services": "bunx concurrently \"bun run --cwd apps/bancho dev\" \"bun run --cwd apps/processor dev\" \"bun run --cwd apps/web dev\"",

// await Promise.all([
//     $`bun run --cwd apps/bancho dev`,
//     $`bun run --cwd apps/processor dev`,
//     $`bun run --cwd apps/web dev`,
// ])

// bun run --env-file=.env --filter '*' dev

await $`bun run --env-file=.env --filter '*' dev`;
