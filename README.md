# MUG - Music Game

## Overview

MUG is a rhythm game built with SvelteKit (Svelte 5) on Bun. Backend services run via Docker Compose with PostgreSQL (Drizzle ORM), Minio, and Better Auth.

## Prerequisites

Install:

- **Bun** ([guide](https://bun.sh/docs/installation))
- **Docker** ([guide](https://docs.docker.com/get-docker/))
- **Docker Compose** ([guide](https://docs.docker.com/compose/install/))

## Getting Started

1. **Clone**
   ```bash
   git clone <your-repository-url>
   cd mug
   ```
2. **Install dependencies**
   ```bash
   bun install
   ```
3. **Start Docker services** (frontend, db, Minio)
   ```bash
   bun run docker:up
   ```
   App at http://localhost:5173
4. **Push schema**
   ```bash
   bun run db:push
   ```
5. **Generate auth schema** (first setup or auth changes)
   ```bash
   bun run auth:generate
   ```

## Development

The SvelteKit frontend runs in the `frontend` container.

- Dev server: http://localhost:5173
- Live reload via mounted `src`, `static`, and `.svelte-kit` volumes

## Available Scripts

### Main Development

- `bun run dev`: SvelteKit dev server (typically inside the `frontend` container).
- `bun run build`: Production build.
- `bun run preview`: Preview the production build.

### Docker Management

- `bun run docker:up`: Start all services (detached).
- `bun run docker:up-no-frontend`: Start all except frontend.
- `bun run docker:down`: Stop services.
- `bun run docker:destroy`: Stop services and remove volumes (data loss).
- `bun run docker:rebuild`: Rebuild images and start fresh.
- `bun run docker:restart-frontend`: Restart frontend only.

### Development Workflow Options

Options:

1. Full Docker (recommended)
   ```bash
   bun run docker:up
   ```
2. Hybrid (run frontend locally)
   ```bash
   bun run docker:up-no-frontend
   bun run dev
   ```

### Database (Drizzle ORM)

- `bun run db:push`: Push Drizzle schema to PostgreSQL.
- `bun run db:studio`: Open Drizzle Studio.

### Logging (Docker Compose)

These use `docker compose -p mug ...`:

- `bun run log:frontend`: Frontend logs.
- `bun run log:db`: Database logs.
- `bun run log:minio`: Minio logs.
- `bun run log:all`: All service logs.

### Code Quality & Checks

- `bun run prepare`: `svelte-kit sync`.
- `bun run check`: Type check Svelte/TypeScript.
- `bun run check:watch`: Type check in watch mode.
- `bun run format`: Prettier.
- `bun run lint`: Prettier lint.

### Authentication (Better Auth)

- `bun run auth:generate`: Generate Better Auth schema per `src/lib/server/auth.ts`.

## Services

`docker-compose.yml` services:

- **frontend**: SvelteKit (Svelte 5, Vite).
- **db**: PostgreSQL.
- **minio**: S3-compatible storage.
- **minio-init**: Creates the `default` bucket.

## Technology Stack

- **Frontend:** SvelteKit (using Svelte 5), Vite, Tailwind CSS
- **Runtime:** Bun
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** Better Auth
- **Object Storage:** Minio
- **Containerization:** Docker, Docker Compose
- **Code Quality:** Prettier, TypeScript, Svelte Check

## Type Definitions

Shared TypeScript types live in `src/lib/types/`.

- `src/lib/types/index.ts`: re-exports shared and Drizzle-inferred types.
- `src/lib/types/game.ts`: gameplay-specific types (notes, timing, scores).
- `src/lib/types/rendering.ts`: PIXI rendering-related types.
- Server handlers may use SvelteKit-generated `./$types`; client API code uses types from `src/lib/types/index.ts`.
