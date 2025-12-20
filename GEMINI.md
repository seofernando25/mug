### Project Overview: MUG

MUG is a web-based rhythm game featuring real-time multiplayer capabilities. The project is structured as a monorepo using **Bun** as the runtime.

### Tech Stack

- **Frontend:** SvelteKit (Svelte 5 Runes) for the web interface.
- **Backend:** A custom WebSocket server named "Bancho" handles matchmaking and real-time state.
- **Database:** PostgreSQL with Drizzle ORM and Redis.
- **Engine:** PixiJS and `@pixi/sound` drive the visual rendering and audio timing.
- **Communication:** ORPC is used for RPC calls, and ArkType handles strict schema validation for WebSocket packets.

### Architecture & Folder Structure

The codebase separates concerns between applications and shared packages:

- **`apps/web`:** Contains the SvelteKit frontend, UI components (e.g., `SongWheel`, `GameSession`), and "Thin Controller" RPCs.
- **`apps/bancho`:** The dedicated WebSocket server for room management and game synchronization.
- **`packages/`:** Houses shared resources to ensure a "Source of Truth":
  - **`contract`:** Shared ArkType schemas for networking.
  - **`db`:** Database schemas and shared actions.
  - **`engine`:** Core game logic, hit detection, and clock management.

### Key Development Guidelines

1.  **Synchronization:** Multiplayer relies on a strict "Loading Gate" handshake. The server waits for all clients to report `client_ready` (audio loaded) before broadcasting the start signal to prevent desync.
2.  **Game Loop:** The game loop uses a hybrid end-condition. It detects natural audio completion but includes a fallback (Chart Time + Buffer) to prevent the game from freezing if audio events fail.
3.  **Component Reuse:** Logic is extracted into reusable components (e.g., `GameSession`) that handle input and rendering agnostically, allowing the same code to drive both Solo and Multiplayer modes.
4.  **Strict Typing:** Network packets must be strictly defined with discriminated unions; generic `unknown` payloads are avoided.
