# TASKS.md - MVP Development Checklist

This document outlines the ordered tasks to achieve the MVP for our rhythm game.

## Phase 0: Project Setup & Foundation (Est. ~2-3 hours)

1.  **Initialize Project & Install Dependencies:**
    *   [x] Install PixiJS: `bun install pixi.js`.
    *   [x] Install Tweakpane: `bun install tweakpane`

2.  **Basic Routing & Page Structure:**
    *   [x] Create placeholder Svelte files for main routes:
        *   [x] `src/routes/+page.svelte` (will be Login Screen)
        *   [x] `src/routes/home/+page.svelte` (Main Navigation)
        *   [x] `src/routes/solo/+page.svelte` (Song Selection)
        *   [x] `src/routes/solo/play/[songId]/+page.svelte` (Gameplay Screen)
        *   [x] `src/routes/multiplayer/+page.svelte` (Placeholder)
        *   [x] `src/routes/config/+page.svelte` (Placeholder)
        *   [x] `src/routes/about/+page.svelte` (Placeholder)
    *   [x] Create a global layout `src/routes/+layout.svelte`:
        *   [x] Include a header section.
        *   [x] Add a placeholder for the username display.

3.  **Login System (Anonymous, UI Only):**
    *   [x] Create `src/lib/stores/userStore.js` (or `.ts`):
        *   [x] Define a writable Svelte store for `username`.
    *   [x] Implement `src/routes/+page.svelte` (Login Screen):
        *   [x] Add an input field for username.
        *   [x] Add a "JOIN" button.
        *   [x] On "JOIN" click:
            *   [x] If input is empty, generate `GUEST-[random_alphanumeric_id]` (e.g., `GUEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`).
            *   [x] Update the `username` store.
            *   [x] Navigate to `/home` (using `goto` from `$app/navigation`).
    *   [x] In `src/routes/+layout.svelte`:
        *   [x] Subscribe to `username` store and display it in the header.
        *   [x] If `username` is not set, redirect to `/` (login) from `+layout.svelte`'s load function or an `onMount` check (except for `/` itself).

4.  **Home Navigation Screen (`src/routes/home/+page.svelte`):**
    *   [x] Add large, styled buttons (using Tailwind CSS) for:
        *   [x] "SOLO" (links to `/solo`)
        *   [x] "MULTIPLAYER" (links to `/multiplayer`)
        *   [x] "CONFIG" (links to `/config`)
        *   [x] "ABOUT" (links to `/about`)

5.  **Tweakpane Setup:**
    *   [ ] Create `src/lib/utils/TweakpaneManager.js` (or `.ts`):
        *   [ ] Initialize Tweakpane instance.
        *   [ ] Add a "Skip Login" boolean setting.
        *   [ ] Add a method to toggle Tweakpane visibility.
    *   [ ] In `src/routes/+layout.svelte`:
        *   [ ] Import and initialize TweakpaneManager.
        *   [ ] Add global key listener (e.g., tilde `~`) to toggle Tweakpane.
        *   [ ] If "Skip Login" is true and no username is set, auto-set a guest username and navigate to `/home` on initial load.

6.  **Initial Song Data & Structure:**
    *   [x] Create `static/songs/test-song-1/` directory.
    *   [x] Create `static/songs/test-song-1/song.json` with the defined MVP structure:
        *   [x] `metadata` (title, artist, audioFilename, bpm).
        *   [x] `charts` array with one chart object:
            *   [x] `difficultyName`, `lanes: 4`, `noteScrollSpeed`.
            *   [x] A few `hitObjects` (mix of "tap" and "hold").
            *   [x] `mockLeaderboard` array.
    *   [x] Add a placeholder `audio.mp3` to `static/songs/test-song-1/`. (Find a short, royalty-free loop for testing).

---

## Phase 1: Core Gameplay Loop (Est. ~4-5 hours)

1.  **Gameplay Screen Setup (`src/routes/solo/play/[songId]/+page.svelte`):**
    *   [x] Create a Svelte component that will host the PixiJS canvas.
    *   [x] In `onMount`, initialize a PixiJS Application, appending its view (canvas) to a DOM element.
    *   [x] Ensure the canvas takes up the desired gameplay area.
    *   [x] In `onDestroy`, properly destroy the PixiJS application.

2.  **Song Data Loading & Parsing:**
    *   [ ] In the `load` function of `src/routes/solo/play/[songId]/+page.svelte`:
        *   [ ] Get `songId` from params.
        *   [ ] Fetch `static/songs/${songId}/song.json`.
        *   [ ] Pass song data (specifically `charts[0]`) to the page component as a prop.
    *   [ ] In the gameplay component:
        *   [ ] Access the passed song data.
        *   [ ] Load the audio file specified in `song.json` using HTML5 Audio API (`new Audio()`).

3.  **PixiJS - Visual Elements Rendering:**
    *   [ ] **Note Highway:**
        *   [ ] Draw 4 vertical lane lines or distinct colored lane backgrounds.
        *   [ ] Draw a horizontal "Hit Zone" or "Judgment Line" near the bottom of the highway.
    *   [ ] **Beat Lines (Basic):**
        *   [ ] Create a system to draw horizontal lines representing beats, moving down the highway. (Initially, these might just be decorative or tied to a simple interval).
    *   [ ] **Notes:**
        *   [ ] Create a `Note` class or factory function for PixiJS graphics.
        *   [ ] It should be able to render "tap" notes (e.g., simple `PIXI.Graphics` rectangles).
        *   [ ] It should be able to render "hold" notes (e.g., a rectangle for the head, and another for the tail/duration).
        *   [ ] Store note metadata (time, lane, type, duration, PixiJS object) for active notes.

4.  **Note Spawning & Movement Logic:**
    *   [ ] Get `bpm` and `noteScrollSpeed` from song data.
    *   [ ] Determine the "lookahead time" (how far in advance notes should spawn before they reach the hit line).
    *   [ ] In PixiJS's game loop (`app.ticker`):
        *   [ ] Get current audio playback time (`audioElement.currentTime`).
        *   [ ] Iterate through `hitObjects` from `song.json`.
        *   [ ] Spawn a new Note visual when `hitObject.time` is within the lookahead window relative to `audioElement.currentTime`.
        *   [ ] Notes should move downwards each frame. Their speed should be consistent and tied to `noteScrollSpeed` and potentially visual sync rather than exact ms (to ensure smooth scroll).
        *   [ ] Despawn/hide notes that have moved past the hit zone and weren't hit.

5.  **Input Handling:**
    *   [ ] Add global keyboard event listeners (or scoped to the gameplay screen).
    *   [ ] Map specific keys (e.g., D, F, J, K) to lanes 0, 1, 2, 3.
    *   [ ] On key press, record the lane and current time.
    *   [ ] On key release (for hold notes later).

6.  **Hit Detection & Basic Judgment:**
    *   [ ] When a key is pressed for a lane:
        *   [ ] Check if there's an active note in that lane near the Hit Zone.
        *   [ ] Calculate the time difference between the note's target hit time and the player's input time.
        *   [ ] **MVP Judgment:** If within a generous timing window, consider it a "HIT". Otherwise, "MISS".
        *   [ ] If "HIT", remove/hide the note, potentially play a small visual effect (e.g., flash).
        *   [ ] If a note passes the hit zone without being hit, mark it as a "MISS".
    *   [ ] **Hold Notes (Basic):**
        *   [ ] Detect initial press on a hold note's head.
        *   [ ] For MVP, a successful initial press might be enough to count the whole hold note.

7.  **Audio Synchronization & Playback Control:**
    *   [ ] Start audio playback when gameplay begins (e.g., after a short countdown or immediately).
    *   [ ] Ensure note movement is visually tied to the song's progress. `audioElement.currentTime` is the source of truth for timing.
    *   [ ] Pause audio if the game is paused (future feature, but good to keep in mind).

8.  **Tweakpane - Gameplay Debug:**
    *   [ ] Add "Auto-Play" toggle: if true, notes are automatically marked as "HIT" when they reach the hit zone. (Helps verify note spawning and timing).
    *   [ ] Add control for Master Audio Volume.

---

## Phase 2: Basic UI & Polish (Est. ~1-2 hours)

1.  **Basic Song Selection Screen (`src/routes/solo/+page.svelte`):**
    *   [ ] Fetch a list of available songs (for MVP, this could be a hardcoded array of `songId`s or by reading `static/songs/` directory structure if doing SSR or in a `load` function).
        *   *Simplest MVP:* Hardcode `[{id: "test-song-1", title: "Test Song 1"}]`.
    *   [ ] Display song titles as a list. Use Tailwind CSS for basic styling.
    *   [ ] Each list item should be a link to `/solo/play/[songId]`.
    *   [ ] When a song is conceptually "selected" (e.g., hovered or last clicked, for MVP it's just before navigating):
        *   [ ] Display the `mockLeaderboard` from its `song.json` (or the component's hardcoded mock).

2.  **In-Game UI Elements (PixiJS or HTML Overlay):**
    *   [ ] **Score Display:**
        *   [ ] Increment score on successful hits.
        *   [ ] Display current score on screen.
    *   [ ] **Combo Display:**
        *   [ ] Increment combo on successful hits. Reset on miss.
        *   [ ] Display current combo on screen.
    *   [ ] **Judgment Text:**
        *   [ ] When a judgment occurs (HIT/MISS), display text briefly (e.g., "PERFECT!", "MISS").
    *   [ ] **Visual Feedback:**
        *   [ ] Subtle screen shake on "MISS" (optional, can be simple DOM manipulation or a PixiJS stage effect).

3.  **End of Song Screen/Summary:**
    *   [ ] Detect when the song (and all its notes) have finished.
    *   [ ] Display a summary: Final Score, Max Combo, (Counts of Perfect/Good/Miss - future).
    *   [ ] Add a button to go back to Song Selection (`/solo`).

4.  **Basic Tailwind Styling:**
    *   [ ] Apply basic Tailwind utility classes to all created Svelte components (Login, Home, Placeholders, Song Select) for a clean, consistent look.
    *   [ ] Ensure buttons, inputs, and text are legible and reasonably styled.
