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
*   `bun run docker:down`: Stops all running Docker Compose services.
*   `bun run docker:destroy`: Stops all services and removes their volumes (warning: this will delete data in the database and Minio).
*   `bun run docker:rebuild`: Shuts down services, removes volumes, and then rebuilds the Docker images (specifically the `frontend` image) before starting them up again. Useful when `Dockerfile` changes or to ensure a clean build.

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

---

Feel free to expand on any section or add more details specific to your project's features!
