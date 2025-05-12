# MUG - Rhythm Game MVP

## Vision

A clean, web-based 2D rhythm game inspired by Tetris.io's UI, featuring a Rocksmith-style note highway and keyboard-based gameplay. Built with Svelte 5, PixiJS, and styled with Tailwind CSS 4 for rapid development and a smooth 2D experience.

## Tech Stack

*   **Framework:** Svelte 5 / SvelteKit
*   **Rendering:** PixiJS
*   **Styling:** Tailwind CSS 4
*   **Build/Package Manager:** Bun

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd mug
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Run the development server:**
    ```bash
    bun run dev -- --open
    ```
    This will start the development server and open the application in your default browser.

## Project Structure

*   `src/`: Contains the main application code.
    *   `lib/`: Reusable components, utilities, stores.
    *   `routes/`: SvelteKit page routes.
*   `static/`: Static assets, including song data (`songs/`).
*   `TASKS.md`: Detailed task list for development.
*   `MVP.md`: High-level Minimum Viable Product plan.

## Development Goals

Refer to `TASKS.md` for the detailed development checklist and `MVP.md` for the overall project scope and features planned for the Minimum Viable Product.
