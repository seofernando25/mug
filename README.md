# MUG - Music Game

## Overview

MUG is a rhythm game application built with a modern web stack. This project utilizes SvelteKit (with Svelte 5) for the frontend, powered by Bun. The backend services are containerized using Docker and Docker Compose, including a PostgreSQL database managed with Drizzle ORM, Minio for object storage, and Better Auth for handling authentication.

This README provides instructions on how to set up, run, and develop the MUG application.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
*   **Bun:** (Includes Node.js) - Follow the [official installation guide](https://bun.sh/docs/installation).
*   **Docker:** - Follow the [official installation guide](https://docs.docker.com/get-docker/).
*   **Docker Compose:** (Usually included with Docker Desktop) - Follow the [official installation guide](https://docs.docker.com/compose/install/).

## Getting Started

Follow these steps to get the MUG application up and running on your local machine:

1.  **Clone the Repository** (if you haven't already):
    ```bash
    git clone <your-repository-url>
    cd mug 
    ```

2.  **Install Dependencies**:
    Install all project dependencies using Bun:
    ```bash
    bun install
    ```

3.  **Start Docker Services**:
    This command will start all the necessary services (frontend, database, Minio) in detached mode as defined in `docker-compose.yml`. The frontend SvelteKit application will be built and run within its container.
    ```bash
    bun run docker:up
    ```
    Your SvelteKit application should now be accessible at `http://localhost:5173`.

4.  **Push Database Schema**:
    Once the database service is running, push your Drizzle ORM schema to the database. This will create the necessary tables based on your schema definition (`src/lib/server/db/schema.ts` or similar).
    ```bash
    bun run db:push
    ```

5.  **Generate Authentication Schema** (if setting up for the first time or after auth config changes):
    This command generates the necessary database schema components for Better Auth.
    ```bash
    bun run auth:generate
    ```

## Development

The SvelteKit frontend application runs inside a Docker container managed by the `frontend` service in `docker-compose.yml`.
*   The development server is accessible at `http://localhost:5173`.
*   **Live Reloading:** Thanks to Docker volume mounts, any changes you make to the files in the `./src` or `./static` directories on your local machine will be reflected live in the running container, and the SvelteKit development server will automatically reload.
*   The `.svelte-kit` directory is also mounted to ensure build artifacts and development server state are synchronized between your local machine and the container.

## Available Scripts

The `package.json` file includes several scripts to help with development and management:

### Main Development
*   `bun run dev`: Runs the SvelteKit development server. (Note: For this project, this is typically run *inside* the `frontend` Docker container, initiated by `docker compose up`).
*   `bun run build`: Builds the SvelteKit application for production.
*   `bun run preview`: Previews the production build locally.

### Docker Management
*   `bun run docker:up`: Starts all services defined in `docker-compose.yml` in detached mode.
*   `bun run docker:up-no-frontend`: Starts all services except the frontend (useful when you want to run the frontend locally).
*   `bun run docker:down`: Stops all running Docker Compose services.
*   `bun run docker:destroy`: Stops all services and removes their volumes (warning: this will delete data in the database and Minio).
*   `bun run docker:rebuild`: Shuts down services, removes volumes, and then rebuilds the Docker images (specifically the `frontend` image) before starting them up again. Useful when `Dockerfile` changes or to ensure a clean build.
*   `bun run docker:restart-frontend`: Restarts only the frontend service.

### Development Workflow Options

You have two main options for running the application during development:

1. **Full Docker Setup** (Recommended for most cases):
   ```bash
   bun run docker:up
   ```
   This runs everything in Docker containers, including the frontend.

2. **Hybrid Setup** (Useful when you want more control over the frontend):
   ```bash
   # Start all services except frontend
   bun run docker:up-no-frontend
   
   # Run frontend locally
   bun run dev
   ```
   This approach can be helpful when:
   - You want to use local development tools more easily
   - You're experiencing issues with the frontend in Docker
   - You want to use different frontend configurations

### Database (Drizzle ORM)
*   `bun run db:push`: Pushes your Drizzle ORM schema changes to the PostgreSQL database.
*   `bun run db:studio`: Opens Drizzle Studio in your browser, allowing you to inspect and manage your database.

### Logging (Docker Compose)
These commands use `docker compose -p mug ...` to target this specific project's containers.
*   `bun run log:frontend`: Tails the logs for the `frontend` (SvelteKit) service without the container name prefix for cleaner output.
*   `bun run log:db`: Tails the logs for the `db` (PostgreSQL) service.
*   `bun run log:minio`: Tails the logs for the `minio` service.
*   `bun run log:all`: Tails the logs for all running services in the project.

### Code Quality & Checks
*   `bun run prepare`: Runs `svelte-kit sync`.
*   `bun run check`: Performs type checking for your Svelte and TypeScript code.
*   `bun run check:watch`: Runs type checking in watch mode.
*   `bun run format`: Formats your codebase using Prettier.
*   `bun run lint`: Checks your codebase for formatting issues with Prettier.

### Authentication (Better Auth)
*   `bun run auth:generate`: Generates or updates the database schema parts required by Better Auth based on your configuration in `src/lib/server/auth.ts`.

## Services

The `docker-compose.yml` file defines the following services:

*   **`frontend`**: The SvelteKit application running with Svelte 5 and Vite.
*   **`db`**: A PostgreSQL database instance for storing application data.
*   **`minio`**: An S3-compatible object storage service, used for storing files like song assets.
*   **`minio-init`**: A helper service that runs once to create the default bucket (`default`) in Minio.

## Technology Stack

*   **Frontend:** SvelteKit (using Svelte 5), Vite, Tailwind CSS
*   **Runtime:** Bun
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Authentication:** Better Auth
*   **Object Storage:** Minio
*   **Containerization:** Docker, Docker Compose
*   **Code Quality:** Prettier, TypeScript, Svelte Check

## Type Definitions

This project centralizes its TypeScript type definitions to improve maintainability and type safety. Most shared types are located in the `src/lib/types/` directory.

*   **Main Type Hub (`src/lib/types/index.ts`)**: 
    *   This file is the primary export point for most shared types.
    *   **Database Inferred Types**: It contains types directly inferred from the Drizzle ORM schemas (e.g., `Song`, `User`, `Chart`, `ChartHitObject`, `Score`) using `typeof schemaName.$inferSelect` and `typeof schemaName.$inferInsert`. These provide base types that match the database structure.
    *   **Application-Specific Types**: Derived and composed types used across the client and server (e.g., `SongListItem`, `SongDetail`, `ClientChart`, `LeaderboardEntry`). These often combine inferred types with additional properties or pick/omit fields for specific use cases.
    *   **API Response Wrappers**: Generic wrappers for API responses like `ApiListResponse<T>` and `ApiSingleResponse<T>`.
    *   **Import/Export Types**: Specific structures for data import or export processes (e.g., `SongImportData`, `SongImportMetadata`).

*   **Gameplay Types (`src/lib/types/game.ts`)**: 
    *   Contains types specifically related to the game logic and state.
    *   Examples: `GameplayNote`, `GameplayChart` (which extend client types with gameplay-specific fields like hit status or detailed timing information), `TimingPoint`, `NoteGraphicsEntry`, `Judgement`, `GameplayScore`.
    *   These types are re-exported by `src/lib/types/index.ts`.

*   **Rendering Types (`src/lib/types/rendering.ts`)**: 
    *   Contains types related to the PIXI.js rendering engine and visual components of the game.
    *   Examples: `NoteGraphics`, `HighwayGraphics`, `BeatLineGraphics`, `ReceptorGraphics`, `JudgmentText`, `NoteContext`.
    *   These types are also re-exported by `src/lib/types/index.ts`.

*   **Server-Side Types**: 
    *   While many server-side data structures will use the inferred Drizzle types or application-specific types from `src/lib/types/index.ts`, SvelteKit endpoint handlers (`+server.ts` files) often define their `RequestHandler` type locally or import it from `./$types` which are generated by SvelteKit.

*   **Client-Side API Types (`src/lib/client/api.ts`)**: 
    *   This file defines functions for making client-side API calls.
    *   It imports its request and response data structure types (like `SongListItem`, `SongDetail`, `SongListApiResponse`, `SongDetailApiResponse`) directly from `src/lib/types/index.ts`.

By centralizing types, especially leveraging Drizzle's inference, we aim to reduce redundancy and ensure that data structures are consistent across different parts of the application.
