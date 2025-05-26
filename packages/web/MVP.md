**MVP Plan Document:**

**Project Title:** [Your Rhythm Game Name Here] - MVP

**Vision:** A clean, web-based 2D rhythm game inspired by Tetris.io's UI, featuring a Rocksmith-style note highway and keyboard-based gameplay. Built with Svelte 5, PixiJS, and styled with Tailwind CSS 4 for rapid development and a smooth 2D experience.

**Core Inspirations:**
*   **Tetris.io:** Clean UI, anonymous login, clear navigation.
*   **osu! (conceptual):** Structured song data.
*   **Rocksmith/Guitar Hero:** Note highway, beat lines, hold notes.

**Target MVP Features (Scoped for Rapid Initial Development - aiming for 1-Day):**

1.  **Login Screen (`/` or initial view):**
    *   Input field for username.
    *   If username is empty, generate "GUEST-[random_alphanumeric_id]".
    *   "JOIN" button.
    *   User's chosen/generated name stored in a Svelte store.

2.  **Home Screen (after login):**
    *   Display current username in the top-right corner.
    *   Navigation buttons: **SOLO**, **MULTIPLAYER** (placeholder), **CONFIG** (placeholder), **ABOUT** (placeholder).

3.  **Solo - Song Selection Screen (`/solo`):**
    *   **MVP Initial (Day 1):**
        *   Display a simple list of available songs (titles only, loaded from static song data).
        *   Clicking a song title navigates to gameplay.
        *   Display a *mock static leaderboard* (e.g., 3-5 placeholder scores/names) for the currently highlighted/selected song (hardcoded in `song.json` or in the component).
    *   **MVP Fast Follow-up (Post-Day 1):**
        *   Leaderboard populates from `localStorage` (scores saved locally per song).
        *   *Later*: Transition leaderboard to use a SvelteKit backend API with in-memory storage.

4.  **Solo Gameplay (`/solo/play/[songId]`):**
    *   **Song Loading:**
        *   Fetch `song.json` (see structure below).
        *   Load audio.
    *   **Gameplay Scene (PixiJS):**
        *   2D canvas.
        *   **Note Highway:** 4 vertical lanes for the MVP.
        *   **Beat Lines:** Basic horizontal lines.
        *   **Notes:** "Tap" notes (simple rectangles) and "Hold" notes (rectangles with duration).
        *   **Hit Zone/Judgment Line.**
    *   **Input Handling:** Keyboard presses mapped to 4 lanes (e.g., D, F, J, K).
    *   **Core Rhythm Logic:**
        *   Note sync with audio & BPM.
        *   Hit detection (timing against hit line).
        *   Judgment: Perfect, Good, Miss (text popup, subtle screenshake on Miss).
        *   Scoring: Points per hit, combo counter.
        *   Basic hold note handling (points for hit, ideally for completing the hold).
    *   **End of Song:** Display score summary.
        *   **MVP Fast Follow-up (Post-Day 1):** Option to save score to `localStorage`.

5.  **Song Data Structure (MVP - `song.json`):**
    *   Each song in `static/songs/[unique_song_id_folder]/`.
    *   `song.json` contents:
        ```json
        {
          "metadata": {
            "title": "My Awesome Song",
            "artist": "The Devs",
            "audioFilename": "audio.mp3",
            "bpm": 120,
            "previewStartTime": 0 // ms (future use)
            // "offset": 0 // ms, if audio needs initial sync adjustment (future use)
          },
          "charts": [ // Array to support multiple difficulties/lane counts in future
            {
              "difficultyName": "Normal",
              "lanes": 4, // Fixed to 4 for MVP implementation
              "noteScrollSpeed": 1.0,
              "lyrics": [ // Optional
                { "time": 5000, "text": "First line" }
              ],
              "hitObjects": [
                { "time": 1000, "lane": 0, "type": "tap" },
                { "time": 2000, "lane": 2, "type": "hold", "duration": 1000 }
              ],
              "mockLeaderboard": [ // For initial MVP display
                { "name": "RhythmPro", "score": 120500 },
                { "name": "BeatzMaster", "score": 110000 }
              ]
            }
          ]
        }
        ```
    *   *For MVP, game will always load `charts[0]`.*

6.  **Tweakpane Integration:**
    *   Toggle with tilde (~).
    *   "Skip Login".
    *   Direct song load dropdown (for test song).
    *   Master audio volume.
    *   "Auto-Play" toggle (for testing sync).

**Technical Stack & Structure:**

*   **Framework:** Svelte 5, SvelteKit.
*   **2D Rendering:** PixiJS.
*   **Styling:** **Tailwind CSS 4** (SvelteKit will handle the necessary build integration).
*   **Static Assets:** Files stored in the `static` folder.

**File Structure:** (As previously outlined, focusing on Svelte components and PixiJS logic separated. Tailwind classes will be used directly in Svelte components.)

**Phased Development (Ultra-Focused for 1-Day MVP):**

1.  **CORE SETUP (2-3 hours):**
    *   SvelteKit 5, PixiJS, **Tailwind CSS 4 setup**.
    *   Login (name store), Home Nav (`SOLO` button).
    *   Tweakpane ("Skip Login").
    *   ONE `song.json` (4-lane chart) & audio.
2.  **CORE GAMEPLAY LOOP (4-5 hours):**
    *   `/solo/play/[songId]` route, PixiJS canvas.
    *   Load test song, render basic highway, hit zone, notes (tap & hold).
    *   Keyboard input (4 keys).
    *   Basic hit detection & judgment (console/simple text).
    *   Audio sync.
3.  **BASIC UI & POLISH (1-2 hours, if time):**
    *   Song selection: list test song, click to play. Mock leaderboard display.
    *   Score/combo in gameplay. End of song score.
    *   Style basic UI elements using Tailwind CSS.

**Key TODOs (Immediately Post-1-Day MVP):**
1.  **Leaderboards:**
    *   Implement `localStorage` saving/loading for scores on song selection.
    *   *Then:* Implement SvelteKit backend API routes for in-memory server-side leaderboard.
2.  **Gameplay Polish:**
    *   Refine hit timing windows (Perfect, Good, Miss, etc.).
    *   Full hold note logic (start, sustain points, release timing).
    *   Improved visual/audio feedback for judgments.
    *   Beat lines synced to BPM.
3.  **Song Selection Enhancements:**
    *   Search, sort, filter for song list.
    *   Audio preview for songs.
4.  **Content:** Add more songs/charts.
5.  **Advanced Features (Future):**
    *   Support for variable lanes defined in `song.json` charts.
    *   Lyrics display during gameplay.
    *   User accounts & persistent database.
    *   Actual multiplayer.
